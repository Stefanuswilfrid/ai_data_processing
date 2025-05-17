"use server"

import { revalidatePath } from "next/cache"
import * as XLSX from "xlsx"
import type { ProductData } from "@/lib/types"
import { logger } from "@/lib/utils/logger"
import { extractDataWithAI } from "./ai-service"
import { sleep } from "@/lib/utils/helpers"

export async function extractProductData(
  urls: string[],
  instruction: string,
): Promise<{ data: ProductData[]; downloadUrl: string }> {
  logger.info(`Starting extraction for ${urls.length} URLs`)

  // Process URLs sequentially instead of in parallel to avoid rate limits
  const results: ProductData[] = []

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]

    // Dispatch event for UI updates
    if (typeof window !== "undefined") {
      const event = new CustomEvent("url-processing", { detail: { index: i } })
      window.dispatchEvent(event)
    }

    try {
      logger.info(`Processing URL ${i + 1}/${urls.length}: ${url}`)

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      logger.info(`Successfully fetched HTML for ${url} (${html.length} bytes)`)

      // Process with AI with retry logic
      let retries = 0
      const maxRetries = 3
      let extractedData: ProductData | null = null
      let waitTime = 5000 // Start with 5 seconds

      while (retries < maxRetries && !extractedData) {
        try {
          extractedData = await extractDataWithAI(html, url, instruction)

          // Validate the data to ensure no [object Object] issues
          if (extractedData) {
            // Ensure all fields are strings
            Object.keys(extractedData).forEach((key) => {
              if (extractedData && typeof extractedData[key] === "object" && extractedData[key] !== null) {
                extractedData[key] = JSON.stringify(extractedData[key])
              }
            })
          }

          results.push(extractedData)
        } catch (error: any) {
          retries++

          // Check if it's a rate limit error
          if (
            error.reason === "maxRetriesExceeded" ||
            (error.responseBody && error.responseBody.includes("rate_limit_exceeded"))
          ) {
            // Get retry time from error if available, or use exponential backoff
            let retryAfterMs = 0
            try {
              if (error.responseHeaders && error.responseHeaders["retry-after-ms"]) {
                retryAfterMs = Number.parseInt(error.responseHeaders["retry-after-ms"])
              } else if (error.responseHeaders && error.responseHeaders["retry-after"]) {
                retryAfterMs = Number.parseInt(error.responseHeaders["retry-after"]) * 1000
              }
            } catch (e) {
              // If parsing fails, use exponential backoff
              retryAfterMs = Math.min(waitTime * Math.pow(2, retries), 60000) // Max 1 minute
            }

            // Add a buffer to the retry time
            retryAfterMs = Math.max(retryAfterMs + 5000, 10000)
            waitTime = retryAfterMs

            logger.warn(
              `Rate limit hit, waiting for ${retryAfterMs / 1000} seconds before retry ${retries}/${maxRetries}`,
            )
            await sleep(retryAfterMs)
          } else if (retries < maxRetries) {
            // For other errors, retry with exponential backoff
            const backoffTime = Math.min(waitTime * Math.pow(2, retries), 30000)
            logger.warn(`Error processing URL, retrying in ${backoffTime / 1000} seconds (${retries}/${maxRetries})`)
            await sleep(backoffTime)
          } else {
            // Max retries reached, add error result
            logger.error(`Failed to process ${url} after ${maxRetries} retries:`, error)
            results.push({ error: `Failed to process ${url} after multiple attempts`, url })
            break
          }
        }
      }

      // Add a delay between URLs to avoid rate limits
      if (i < urls.length - 1) {
        const delayBetweenUrls = 5000 // 5 seconds
        logger.info(`Waiting ${delayBetweenUrls / 1000} seconds before processing next URL...`)
        await sleep(delayBetweenUrls)
      }
    } catch (error) {
      logger.error(`Error processing ${url}:`, error)
      results.push({ error: `Failed to process ${url}`, url })
    }
  }

  // Filter out errors and format the data
  const validResults = results.filter((result) => !result.error)
  logger.info(`Successfully extracted data from ${validResults.length}/${urls.length} URLs`)

  // Generate Excel file
  const workbook = XLSX.utils.book_new()

  // Sanitize data for Excel
  const sanitizedResults = results.map((result) => {
    const sanitized = { ...result }
    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        sanitized[key] = JSON.stringify(sanitized[key])
      }
    })
    return sanitized
  })

  const worksheet = XLSX.utils.json_to_sheet(sanitizedResults)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Data")

  // Convert to base64 string
  const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" })

  // Create a data URL that can be used for download
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBuffer}`

  logger.info(`Excel file generated as data URL`)

  revalidatePath("/")
  return { data: results, downloadUrl: dataUrl }
}
