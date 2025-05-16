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
      const maxRetries = 5 // Increased from 3
      let extractedData: ProductData | null = null
      let waitTime = 5000 // Start with 5 seconds

      while (retries < maxRetries && !extractedData) {
        try {
          extractedData = await extractDataWithAI(html, url, instruction)
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
              retryAfterMs = Math.min(waitTime * Math.pow(2, retries), 120000) // Max 2 minutes
            }

            // Add a buffer to the retry time and ensure it's at least 30 seconds
            retryAfterMs = Math.max(retryAfterMs + 5000, 30000)
            waitTime = retryAfterMs

            logger.warn(
              `Rate limit hit, waiting for ${retryAfterMs / 1000} seconds before retry ${retries}/${maxRetries}`,
            )
            await sleep(retryAfterMs)
          } else if (retries < maxRetries) {
            // For other errors, retry with exponential backoff
            const backoffTime = Math.min(waitTime * Math.pow(2, retries), 60000)
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

      // Add a significant delay between URLs to avoid rate limits
      // The delay increases with each URL processed
      if (i < urls.length - 1) {
        const delayBetweenUrls = Math.min(30000 + i * 10000, 60000) // 30-60 seconds
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
  const worksheet = XLSX.utils.json_to_sheet(results) // Include all results including errors
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Data")

  // Convert to base64 string
  const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" })

  // Create a data URL that can be used for download
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBuffer}`

  logger.info(`Excel file generated as data URL`)

  revalidatePath("/")
  return { data: results, downloadUrl: dataUrl } // Return all results including errors
}
