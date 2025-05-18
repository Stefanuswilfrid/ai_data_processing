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

// Update the fetchWithRetry function to always return a string

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

  // Special handling for BWS
  if (domain.includes("bws.com.au")) {
    logger.info(`BWS website detected. Using enhanced extraction for ${url}`)

    // For BWS, extract product info from the URL itself
    const productData = extractBwsProductInfo(url)

    if (productData && productData.productId) {
      try {
        // Try to enrich with additional data from API
        const enrichedData = await enrichBwsProductData(productData.productId)

        // Merge the enriched data with the URL-extracted data
        // Prioritize API data over URL-extracted data
        const mergedData = {
          ...productData,
          ...enrichedData,
          sourceUrl: url,
          _salvaged: true,
        }

        // Convert the product data to HTML for consistency
        return `
          <html>
            <body>
              <h1>${mergedData.productName || ""}</h1>
              ${Object.entries(mergedData)
                .filter(([key]) => !["productName", "sourceUrl", "_salvaged"].includes(key))
                .map(([key, value]) => {
                  if (value === undefined || value === null) return ""
                  if (typeof value === "object") {
                    return `<div class="${key}">${JSON.stringify(value)}</div>`
                  }
                  return `<div class="${key}">${value}</div>`
                })
                .join("\n")}
              <div class="product-url">${url}</div>
              <div class="salvaged">true</div>
            </body>
          </html>
        `
      } catch (error) {
        // If enrichment fails, just use the basic data
        logger.warn(`API enrichment failed, using URL-extracted data: ${error}`)

        // Convert the product data to HTML for consistency
        return `
          <html>
            <body>
              <h1>${productData.productName || ""}</h1>
              ${Object.entries(productData)
                .filter(([key]) => !["productName", "sourceUrl", "_salvaged"].includes(key))
                .map(([key, value]) => {
                  if (value === undefined || value === null) return ""
                  if (typeof value === "object") {
                    return `<div class="${key}">${JSON.stringify(value)}</div>`
                  }
                  return `<div class="${key}">${value}</div>`
                })
                .join("\n")}
              <div class="product-url">${url}</div>
              <div class="salvaged">true</div>
            </body>
          </html>
        `
      }
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
        next: { revalidate: 60 }, // Cache for 1 minute
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

// Then modify the extractProductData function to use the new fetchWithRetry function
export async function extractProductData(
  urls: string[],
  instruction: string,
): Promise<{ data: ProductData[]; downloadUrl: string }> {
  // Reset cancellation flag at the start
  shouldCancelExtraction = false

  // Initialize progress with correct total URLs count
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
    const domain = new URL(url).hostname.toLowerCase()

    // Update progress with correct indices
    updateProgress({
      currentUrl: url,
      currentUrlIndex: i,
      totalUrls: urls.length,
      status: `Fetching content from ${url}...`,
      percent: i === 0 ? 5 : Math.round((i / urls.length) * 100),
    })

    try {
      logger.info(`Processing URL ${i + 1}/${urls.length}: ${url}`)

      // Special handling for BWS URLs
      if (domain.includes("bws.com.au")) {
        // For BWS, extract product info from the URL itself
        const productData = extractBwsProductInfo(url)

        if (productData && productData.productId) {
          try {
            // Try to enrich with additional data from API
            const enrichedData = await enrichBwsProductData(productData.productId)

            // Merge the enriched data with the URL-extracted data
            // Prioritize API data over URL-extracted data
            const mergedData = {
              ...productData,
              ...enrichedData,
              sourceUrl: url,
              _salvaged: true,
            }

            // Add to results and continue to next URL
            results.push(mergedData)

            // Update progress
            updateProgress({
              currentUrl: url,
              currentUrlIndex: i,
              totalUrls: urls.length,
              status: `Completed ${url} (API data)`,
              percent: Math.min(95, Math.round(((i + 1) / urls.length) * 100) + 25),
            })

            continue
          } catch (error) {
            // If enrichment fails, just use the basic data
            logger.warn(`API enrichment failed, using URL-extracted data: ${error}`)
            results.push(productData)

            // Update progress
            updateProgress({
              currentUrl: url,
              currentUrlIndex: i,
              totalUrls: urls.length,
              status: `Completed ${url} (limited data)`,
              percent: Math.min(95, Math.round(((i + 1) / urls.length) * 100) + 25),
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
