"use server"

import { revalidatePath } from "next/cache"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import * as XLSX from "xlsx"
import { extractRelevantHtml } from "@/lib/utils/html-extractor"
import { generateEcommercePrompt } from "@/lib/utils/prompt-generator"
import { parseProductData } from "@/lib/utils/data-parser"
import { logger } from "@/lib/utils/logger"
import type { ProductData } from "@/lib/types"

// Global progress state (in-memory only)
let extractionProgress = {
  currentUrl: "",
  currentUrlIndex: 0,
  totalUrls: 0,
  status: "",
  percent: 0,
}

// Simple in-memory progress tracking
function updateProgress(progress: typeof extractionProgress) {
  extractionProgress = progress
}

// Function to get the current extraction progress
export async function getExtractionProgress() {
  return extractionProgress
}

// Flag to track if extraction should be cancelled
let shouldCancelExtraction = false

// Function to cancel the extraction process
export async function cancelExtraction() {
  shouldCancelExtraction = true
  return { success: true }
}

// Reset cancellation flag
export async function resetCancellation() {
  shouldCancelExtraction = false
  return { success: true }
}

export async function transformImage(
  imageUrl: string,
  prompt: string,
  aspectRatio: string,
): Promise<{ imageUrl: string }> {
  // Placeholder implementation - replace with actual image transformation logic
  console.log("Transforming image:", imageUrl, prompt, aspectRatio)
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate processing time
  const transformedImageUrl = `/transformed_${imageUrl.split("/").pop()}` // Simulate a transformed URL
  return { imageUrl: transformedImageUrl }
}

// Then modify the extractProductData function to return progress updates directly
export async function extractProductData(
  urls: string[],
  instruction: string,
): Promise<{ data: ProductData[]; downloadUrl: string }> {
  // Reset cancellation flag at the start
  shouldCancelExtraction = false

  // Initialize progress
  updateProgress({
    currentUrl: "",
    currentUrlIndex: 0,
    totalUrls: urls.length,
    status: "Initializing extraction...",
    percent: 0,
  })

  logger.info(`Starting extraction for ${urls.length} URLs with instruction: ${instruction}`)

  // Process URLs sequentially
  const results: ProductData[] = []

  for (let i = 0; i < urls.length; i++) {
    // Check for cancellation flag
    if (shouldCancelExtraction) {
      logger.info("Extraction cancelled by user")
      throw new Error("Extraction cancelled")
    }

    const url = urls[i]

    // Update progress
    updateProgress({
      currentUrl: url,
      currentUrlIndex: i,
      totalUrls: urls.length,
      status: `Fetching content from ${url}...`,
      percent: i === 0 ? 5 : Math.round((i / urls.length) * 100),
    })

    try {
      logger.info(`Processing URL ${i + 1}/${urls.length}: ${url}`)

      // Fetch HTML content
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

      // Check for cancellation again
      if (shouldCancelExtraction) {
        logger.info("Extraction cancelled by user after fetching HTML")
        throw new Error("Extraction cancelled")
      }

      // Update progress
      updateProgress({
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Analyzing product content...",
        percent: Math.round(((i + 0.3) / urls.length) * 100) + 10,
      })

      // Extract relevant HTML to reduce token usage
      const relevantHtml = extractRelevantHtml(html, url)

      // Check for cancellation again
      if (shouldCancelExtraction) {
        logger.info("Extraction cancelled by user after analyzing HTML")
        throw new Error("Extraction cancelled")
      }

      // Update progress
      updateProgress({
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Extracting product data with AI...",
        percent: Math.round(((i + 0.5) / urls.length) * 100) + 15,
      })

      // Generate site-specific prompt
      const prompt = generateEcommercePrompt(url, instruction, relevantHtml)

      // Always use GPT-4o for Coles products
      const domain = new URL(url).hostname.toLowerCase()
      const model = domain.includes("coles.com.au") ? "gpt-4o" : "gpt-3.5-turbo"

      logger.info(`Using ${model} for extraction from ${url}`)

      // Extract data with AI
      const { text } = await generateText({
        model: openai(model),
        prompt,
        temperature: 0.1, // Lower temperature for more consistent results
        maxTokens: 2000,
      })

      // Check for cancellation again
      if (shouldCancelExtraction) {
        logger.info("Extraction cancelled by user after AI processing")
        throw new Error("Extraction cancelled")
      }

      // Update progress
      updateProgress({
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Processing extracted data...",
        percent: Math.round(((i + 0.8) / urls.length) * 100) + 20,
      })

      // Parse and validate the extracted data
      const extractedData = parseProductData(text, url)

      // Add to results
      results.push({
        ...extractedData,
        sourceUrl: url,
      })

      // Update progress
      updateProgress({
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: `Completed ${url}`,
        percent: Math.min(95, Math.round(((i + 1) / urls.length) * 100) + 25),
      })

      // Add delay between URLs to avoid rate limits
      if (i < urls.length - 1) {
        updateProgress({
          currentUrl: "",
          currentUrlIndex: i,
          totalUrls: urls.length,
          status: "Waiting before processing next URL...",
          percent: Math.round(((i + 1) / urls.length) * 100),
        })

        // Wait 2 seconds between URLs
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      // If this is a cancellation error, rethrow it
      if (error instanceof Error && error.message === "Extraction cancelled") {
        throw error
      }

      logger.error(`Error processing ${url}:`, error)

      // Add error result
      results.push({
        error: `Failed to process ${url}: ${error instanceof Error ? error.message : String(error)}`,
        url,
      })

      // Update progress
      updateProgress({
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: `Error processing ${url}`,
        percent: Math.round(((i + 1) / urls.length) * 100),
      })
    }
  }

  // Update progress
  updateProgress({
    currentUrl: "",
    currentUrlIndex: urls.length - 1,
    totalUrls: urls.length,
    status: "Generating spreadsheet...",
    percent: 95,
  })

  // Generate Excel file
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(results)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Data")

  // Convert to base64 string
  const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" })
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBuffer}`

  // Update progress
  updateProgress({
    currentUrl: "",
    currentUrlIndex: urls.length,
    totalUrls: urls.length,
    status: "Extraction complete!",
    percent: 100,
  })

  logger.info(`Successfully extracted data from ${results.filter((r) => !r.error).length}/${urls.length} URLs`)

  revalidatePath("/")
  return { data: results, downloadUrl: dataUrl }
}

export async function uploadToBlob(file: File): Promise<string> {
  // Create a data URL from the file instead of uploading to Vercel Blob
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as string)
    }
    reader.readAsDataURL(file)
  })
}
