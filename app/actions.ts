"use server"
import { revalidatePath } from "next/cache"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import * as XLSX from "xlsx"
import { extractRelevantHtml } from "@/lib/utils/html-extractor"
import { generateEcommercePrompt } from "@/lib/utils/prompt-generator"
import { parseProductData } from "@/lib/utils/data-parser"
import { logger } from "@/lib/utils/logger"
import { extractBwsProductInfo, enrichBwsProductData } from "@/lib/utils/bws-extractor"
import { extractWithScrapingAPI } from "@/lib/utils/scraping-api-extractor"
import { extractWithBrowseAI } from "@/lib/utils/browse-ai-extractor"
import type { ProductData } from "@/lib/types"
import {
  generateExtractionId,
  storeProgress,
  getProgress,
  getLatestExtractionId,
  cancelExtraction as cancelExtractionInRedis,
} from "@/lib/utils/redis-client"

// Flag to track if extraction should be cancelled
let shouldCancelExtraction = false

export async function getExtractionProgress(extractionId?: string): Promise<any> {
  try {
    if (!extractionId) {
      const latestId = await getLatestExtractionId()
      if (!latestId) {
        return {
          currentUrl: "",
          currentUrlIndex: 0,
          totalUrls: 0,
          status: "No active extraction",
          percent: 0,
        }
      }
      extractionId = latestId as string
    }

    // Get progress from Redis
    const progress = await getProgress(extractionId)
    if (!progress) {
      return {
        currentUrl: "",
        currentUrlIndex: 0,
        totalUrls: 0,
        status: "No data available",
        percent: 0,
      }
    }

    return progress
  } catch (error) {
    console.error("Error getting extraction progress:", error)
    return {
      currentUrl: "",
      currentUrlIndex: 0,
      totalUrls: 0,
      status: "Error fetching progress",
      percent: 0,
      error: String(error),
    }
  }
}

export async function cancelExtraction(extractionId?: string): Promise<{ success: boolean }> {
  try {
    shouldCancelExtraction = true

    if (extractionId) {
      await cancelExtractionInRedis(extractionId)
    } else {
      const latestId = await getLatestExtractionId()
      if (latestId) {
        await cancelExtractionInRedis(latestId)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error cancelling extraction:", error)
    return { success: false }
  }
}

export async function resetCancellation(): Promise<{ success: boolean }> {
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

/**
 * Fetch HTML content with enhanced error handling and anti-blocking measures
 */
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  let retries = 0
  const domain = new URL(url).hostname.toLowerCase()

  // Use ScrapingAPI for BWS and other problematic sites
  if (domain.includes("bws.com.au") || domain.includes("danmurphys.com.au")) {
    // Check if ScrapingAPI key is configured
    if (process.env.SCRAPING_API_KEY) {
      logger.info(`Using ScrapingAPI for ${url}`)
      try {
        return await extractWithScrapingAPI(url)
      } catch (error) {
        logger.error(`ScrapingAPI extraction failed, falling back to URL extraction: ${error}`)
        // Fall back to your existing BWS URL extraction
      }
    }
  }

  // Use Browse.AI for BWS and other problematic sites
  if (
    (domain.includes("bws.com.au") || domain.includes("danmurphys.com.au")) &&
    process.env.BROWSE_AI_API_KEY &&
    process.env.BROWSE_AI_ROBOT_ID
  ) {
    logger.info(`Using Browse.AI for ${url}`)
    try {
      const productData = await extractWithBrowseAI(url)

      // Convert the structured data to HTML for consistency with your existing pipeline
      return `
        <html>
          <body>
            <h1>${productData.productName || ""}</h1>
            <div class="product-price">${productData.price || ""}</div>
            <div class="product-description">${productData.description || ""}</div>
            <div class="product-url">${url}</div>
            ${Object.entries(productData)
              .filter(([key]) => !["productName", "price", "description"].includes(key))
              .map(([key, value]) => `<div class="${key}">${value}</div>`)
              .join("\n")}
          </body>
        </html>
      `
    } catch (error) {
      logger.error(`Browse.AI extraction failed, falling back to URL extraction: ${error}`)
      // Fall back to your existing BWS URL extraction
    }
  }

  // Define different user agents to rotate
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
  ]

  // For other sites, try with retries and rotating user agents
  while (retries < maxRetries) {
    try {
      // Select a random user agent
      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)]

      const response = await fetch(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: new URL(url).origin,
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      retries++
      logger.warn(`Fetch attempt ${retries}/${maxRetries} failed for ${url}: ${error}`)

      if (retries < maxRetries) {
        // Wait with exponential backoff before retrying
        const delay = Math.pow(2, retries) * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        throw error // Re-throw the last error if all retries failed
      }
    }
  }

  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts`)
}

export async function extractProductData(
  urls: string[],
  instruction: string,
): Promise<{ data: ProductData[]; downloadUrl: string; extractionId: string }> {
  // Reset cancellation flag at the start
  shouldCancelExtraction = false

  // Generate a unique extraction ID
  const extractionId = generateExtractionId()

  // Initialize progress with correct total URLs count
  await storeProgress(extractionId, {
    currentUrl: "",
    currentUrlIndex: 0,
    totalUrls: urls.length,
    status: "Initializing extraction...",
    percent: 0,
  })

  logger.info(`Starting extraction ${extractionId} for ${urls.length} URLs with instruction: ${instruction}`)

  // Process URLs sequentially
  const results: ProductData[] = []

  for (let i = 0; i < urls.length; i++) {
    // Check for cancellation flag
    if (shouldCancelExtraction) {
      logger.info(`Extraction ${extractionId} cancelled by user`)

      // Update progress in Redis
      await storeProgress(extractionId, {
        currentUrl: "",
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Extraction cancelled by user",
        percent: 100,
      })

      throw new Error("Extraction cancelled")
    }

    const url = urls[i]
    const domain = new URL(url).hostname.toLowerCase()

    // Update progress with correct indices
    await storeProgress(extractionId, {
      currentUrl: url,
      currentUrlIndex: i,
      totalUrls: urls.length,
      status: `Fetching content from ${url}...`,
      // Change this line to ensure we never report 100% until truly complete
      percent: Math.round((i / urls.length) * 80), // Only go up to 80% during URL processing
    })

    try {
      logger.info(`Processing URL ${i + 1}/${urls.length}: ${url}`)

      // Special handling for BWS URLs - DIRECT APPROACH WITHOUT HTML CONVERSION
      if (domain.includes("bws.com.au")) {
        // For BWS, extract product info from the URL itself
        const productData = extractBwsProductInfo(url)

        if (productData && productData.productId) {
          try {
            // Update progress
            await storeProgress(extractionId, {
              currentUrl: url,
              currentUrlIndex: i,
              totalUrls: urls.length,
              status: `Enriching BWS data for ${url}...`,
              percent: Math.round((i / urls.length) * 80) + 2, // +2% for this step
            })

            // Try to enrich with additional data from API
            const enrichedData = await enrichBwsProductData(productData.productId)

            // Log the data before merging for debugging
            logger.debug(`URL-extracted data: ${JSON.stringify(productData)}`)
            logger.debug(`API-enriched data: ${JSON.stringify(enrichedData)}`)

            // Merge the enriched data with the URL-extracted data
            // Prioritize API data over URL-extracted data
            const mergedData: ProductData = {
              ...productData,
              ...enrichedData,
              sourceUrl: url,
              _salvaged: true,
            }

            // Log the merged data for debugging
            logger.info(`BWS merged data: ${JSON.stringify(mergedData)}`)

            // Add to results and continue to next URL
            results.push(mergedData)

            // Update progress
            await storeProgress(extractionId, {
              currentUrl: url,
              currentUrlIndex: i,
              totalUrls: urls.length,
              status: `Completed ${url} (API data)`,
              percent: Math.min(95, Math.round(((i + 1) / urls.length) * 80) + 25),
            })

            continue
          } catch (error) {
            // If enrichment fails, just use the basic data
            logger.warn(`API enrichment failed, using URL-extracted data: ${error}`)

            // Add to results and continue to next URL
            results.push(productData)

            // Update progress
            await storeProgress(extractionId, {
              currentUrl: url,
              currentUrlIndex: i,
              totalUrls: urls.length,
              status: `Completed ${url} (limited data)`,
              percent: Math.min(95, Math.round(((i + 1) / urls.length) * 80) + 25),
            })

            continue
          }
        }
      }

      // Use the fetchWithRetry function for non-BWS sites or if BWS extraction failed
      let html
      try {
        html = await fetchWithRetry(url)
        logger.info(`Successfully fetched HTML for ${url} (${html.length} bytes)`)
      } catch (fetchError) {
        // If fetch failed, throw the error to be caught by the outer try-catch
        throw fetchError
      }

      // Check for cancellation again
      if (shouldCancelExtraction) {
        logger.info(`Extraction ${extractionId} cancelled by user after fetching HTML`)

        // Update progress in Redis
        await storeProgress(extractionId, {
          currentUrl: url,
          currentUrlIndex: i,
          totalUrls: urls.length,
          status: "Extraction cancelled by user",
          percent: 100,
        })

        throw new Error("Extraction cancelled")
      }

      // Update progress
      await storeProgress(extractionId, {
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Analyzing product content...",
        percent: Math.round((i / urls.length) * 80) + 5, // +5% for this step
      })

      // Extract relevant HTML to reduce token usage
      const relevantHtml = extractRelevantHtml(html, url)

      // Check for cancellation again
      if (shouldCancelExtraction) {
        logger.info(`Extraction ${extractionId} cancelled by user after analyzing HTML`)

        // Update progress in Redis
        await storeProgress(extractionId, {
          currentUrl: url,
          currentUrlIndex: i,
          totalUrls: urls.length,
          status: "Extraction cancelled by user",
          percent: 100,
        })

        throw new Error("Extraction cancelled")
      }

      // Update progress
      await storeProgress(extractionId, {
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Extracting product data with AI...",
        percent: Math.round((i / urls.length) * 80) + 8, // +8% for this step
      })

      // Generate site-specific prompt
      const prompt = generateEcommercePrompt(url, instruction, relevantHtml)

      // Select appropriate model based on site
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
        logger.info(`Extraction ${extractionId} cancelled by user after AI processing`)

        // Update progress in Redis
        await storeProgress(extractionId, {
          currentUrl: url,
          currentUrlIndex: i,
          totalUrls: urls.length,
          status: "Extraction cancelled by user",
          percent: 100,
        })

        throw new Error("Extraction cancelled")
      }

      // Update progress
      await storeProgress(extractionId, {
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: "Processing extracted data...",
        percent: Math.round((i / urls.length) * 80) + 12, // +12% for this step
      })

      // Parse and validate the extracted data
      const extractedData = parseProductData(text, url)

      // Add to results
      results.push({
        ...extractedData,
        sourceUrl: url,
      })

      // Update progress
      await storeProgress(extractionId, {
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: `Completed ${url}`,
        percent: Math.min(95, Math.round(((i + 1) / urls.length) * 80)), // Move to next URL percentage
      })

      // Add delay between URLs to avoid rate limits
      if (i < urls.length - 1) {
        await storeProgress(extractionId, {
          currentUrl: "",
          currentUrlIndex: i,
          totalUrls: urls.length,
          status: "Waiting before processing next URL...",
          percent: Math.round(((i + 1) / urls.length) * 80),
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
      await storeProgress(extractionId, {
        currentUrl: url,
        currentUrlIndex: i,
        totalUrls: urls.length,
        status: `Error processing ${url}`,
        percent: Math.round((i / urls.length) * 80),
      })
    }
  }

  // Update progress
  await storeProgress(extractionId, {
    currentUrl: "",
    currentUrlIndex: urls.length - 1,
    totalUrls: urls.length,
    status: "Generating spreadsheet...",
    percent: 90, // Fixed 90% for spreadsheet generation
  })

  // Generate Excel file
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(results)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Data")

  // Convert to base64 string
  const excelBuffer = XLSX.write(workbook, { type: "base64", bookType: "xlsx" })
  const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${excelBuffer}`

  // Update progress
  await storeProgress(extractionId, {
    currentUrl: "",
    currentUrlIndex: urls.length,
    totalUrls: urls.length,
    status: "Extraction complete!",
    percent: 100, // Only set to 100% at the very end
  })

  logger.info(`Successfully extracted data from ${results.filter((r) => !r.error).length}/${urls.length} URLs`)

  revalidatePath("/")
  return { data: results, downloadUrl: dataUrl, extractionId }
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
