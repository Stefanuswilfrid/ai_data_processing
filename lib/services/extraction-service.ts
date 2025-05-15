"use server"

import { revalidatePath } from "next/cache"
import * as XLSX from "xlsx"
import { put } from "@vercel/blob"
import type { ProductData } from "@/lib/types"
import { logger } from "@/lib/utils/logger"
import { extractDataWithAI } from "./ai-service"

export async function extractProductData(
  urls: string[],
  instruction: string,
): Promise<{ data: ProductData[]; downloadUrl: string }> {
  logger.info(`Starting extraction for ${urls.length} URLs`)

  // Process each URL
  const results = await Promise.all(
    urls.map(async (url, index) => {
      try {
        logger.info(`Processing URL ${index + 1}/${urls.length}: ${url}`)

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

        const extractedData = await extractDataWithAI(html, url, instruction)
        return extractedData
      } catch (error) {
        logger.error(`Error processing ${url}:`, error)
        return { error: `Failed to process ${url}`, url }
      }
    }),
  )

  // Filter out errors and format the data
  const validResults = results.filter((result) => !result.error)
  logger.info(`Successfully extracted data from ${validResults.length}/${urls.length} URLs`)

  // Generate Excel file
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(validResults)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Data")

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  // Upload to Vercel Blob
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const file = new File([blob], "product_data.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const { url } = await put(`product_data_${Date.now()}.xlsx`, file, {
    access: "public",
  })
  logger.info(`Excel file uploaded to ${url}`)

  revalidatePath("/")
  return { data: validResults, downloadUrl: url }
}
