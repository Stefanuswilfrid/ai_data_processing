"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { logger } from "@/lib/utils/logger"
import type { ProductData } from "@/lib/types"

/**
 * Extract the most relevant parts of HTML for product information
 */
function extractRelevantHtml(html: string, url: string): string {
  // Focus on the main product content by looking for common product page patterns
  let relevantHtml = html

  try {
    // First, try to identify the site type to use specialized extraction
    const domain = new URL(url).hostname.toLowerCase()

    // Site-specific extraction patterns
    if (domain.includes("amazon")) {
      return extractAmazonProductHtml(html)
    } else if (domain.includes("jbhifi")) {
      return extractJBHiFiProductHtml(html)
    } else if (domain.includes("walmart")) {
      return extractWalmartProductHtml(html)
    }

    // Generic extraction for unknown sites
    // Extract only the main content area if possible
    const mainContentRegexes = [
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<div[^>]*id=["']?product[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["']?product[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=["']?pdp[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["']?pdp[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*id=["']?details[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
    ]

    for (const regex of mainContentRegexes) {
      const match = html.match(regex)
      if (match && match[1] && match[1].length > 500) {
        relevantHtml = match[1]
        logger.info(`Extracted main content section using regex (${relevantHtml.length} bytes)`)
        break
      }
    }

    // If we couldn't extract a specific section, be more aggressive with truncation
    if (relevantHtml === html) {
      // Remove scripts, styles, and other non-content elements
      relevantHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")

      logger.info(`Removed scripts, styles, and non-content elements (${relevantHtml.length} bytes)`)
    }

    // Further truncate if still too large
    const maxLength = 30000 // Significantly reduced from 100000
    if (relevantHtml.length > maxLength) {
      relevantHtml = relevantHtml.substring(0, maxLength)
      logger.info(`Truncated HTML to ${maxLength} bytes`)
    }
  } catch (error) {
    logger.warn(`Error extracting relevant HTML: ${error}. Using truncated full HTML instead.`)
    // If extraction fails, just truncate the original HTML
    relevantHtml = html.substring(0, 30000)
  }

  return relevantHtml
}

// Site-specific extraction functions
function extractAmazonProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch =
      html.match(/<div[^>]*id=["']?dp-container[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*id=["']?ppd[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*id=["']?centerCol[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)

    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product title and price
    let extractedParts = ""

    // Extract product title
    const titleMatch =
      html.match(/<span[^>]*id=["']?productTitle[^"']*["']?[^>]*>([\s\S]*?)<\/span>/i) ||
      html.match(/<h1[^>]*class=["']?a-size-large[^"']*["']?[^>]*>([\s\S]*?)<\/h1>/i)

    if (titleMatch && titleMatch[0]) {
      extractedParts += titleMatch[0]
    }

    // Extract price
    const priceMatch =
      html.match(/<span[^>]*class=["']?a-price[^"']*["']?[^>]*>([\s\S]*?)<\/span>/i) ||
      html.match(/<span[^>]*id=["']?priceblock_ourprice[^"']*["']?[^>]*>([\s\S]*?)<\/span>/i)

    if (priceMatch && priceMatch[0]) {
      extractedParts += priceMatch[0]
    }

    // Extract product description
    const descMatch =
      html.match(/<div[^>]*id=["']?productDescription[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i) ||
      html.match(/<div[^>]*id=["']?feature-bullets[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)

    if (descMatch && descMatch[0]) {
      extractedParts += descMatch[0]
    }

    if (extractedParts.length > 500) {
      return extractedParts
    }
  } catch (e) {
    logger.warn(`Error in Amazon extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

function extractJBHiFiProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch = html.match(/<div[^>]*class=["']?product-detail[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product information sections
    let extractedParts = ""

    // Extract product title
    const titleMatch = html.match(/<h1[^>]*class=["']?product-title[^"']*["']?[^>]*>([\s\S]*?)<\/h1>/i)
    if (titleMatch && titleMatch[0]) {
      extractedParts += titleMatch[0]
    }

    // Extract price
    const priceMatch = html.match(/<div[^>]*class=["']?price[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (priceMatch && priceMatch[0]) {
      extractedParts += priceMatch[0]
    }

    // Extract product description
    const descMatch = html.match(/<div[^>]*class=["']?product-description[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (descMatch && descMatch[0]) {
      extractedParts += descMatch[0]
    }

    if (extractedParts.length > 500) {
      return extractedParts
    }
  } catch (e) {
    logger.warn(`Error in JB Hi-Fi extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

function extractWalmartProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch = html.match(
      /<div[^>]*class=["']?product-main-content[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i,
    )
    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product information sections
    let extractedParts = ""

    // Extract product title
    const titleMatch = html.match(/<h1[^>]*class=["']?prod-ProductTitle[^"']*["']?[^>]*>([\s\S]*?)<\/h1>/i)
    if (titleMatch && titleMatch[0]) {
      extractedParts += titleMatch[0]
    }

    // Extract price
    const priceMatch = html.match(/<span[^>]*class=["']?price-characteristic[^"']*["']?[^>]*>([\s\S]*?)<\/span>/i)
    if (priceMatch && priceMatch[0]) {
      extractedParts += priceMatch[0]
    }

    // Extract product description
    const descMatch = html.match(/<div[^>]*class=["']?about-product[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (descMatch && descMatch[0]) {
      extractedParts += descMatch[0]
    }

    if (extractedParts.length > 500) {
      return extractedParts
    }
  } catch (e) {
    logger.warn(`Error in Walmart extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

/**
 * Generate a prompt tailored to the specific e-commerce site
 */
function generateSiteSpecificPrompt(url: string, instruction: string, html: string): string {
  const domain = new URL(url).hostname.toLowerCase()

  // Extract site name for better prompting
  let siteName = "this e-commerce site"
  if (domain.includes("amazon")) siteName = "Amazon"
  else if (domain.includes("jbhifi")) siteName = "JB Hi-Fi"
  else if (domain.includes("walmart")) siteName = "Walmart"
  else if (domain.includes("ebay")) siteName = "eBay"
  else if (domain.includes("target")) siteName = "Target"

  // Base prompt template that prioritizes user instructions
  const promptTemplate = `
Extract structured product data from ${siteName}.

URL: ${url}

USER INSTRUCTIONS:
${instruction}

IMPORTANT EXTRACTION GUIDELINES:
- Extract EXACTLY the data fields requested in the user instructions above
- Do NOT add fields that weren't requested unless they're essential
- For price fields, extract the CURRENT selling price with currency symbol
- Format prices as strings with currency symbols (e.g., "$1,299.99")
- If there are multiple prices shown, use the actual current selling price, not RRP/MSRP
- Return all data in a clean JSON format

HTML CONTENT:
${html}

Return ONLY a valid JSON object with the extracted data. No explanations or markdown.
`

  return promptTemplate
}

/**
 * Select the appropriate model based on the complexity of the task
 */
function selectAppropriateModel(html: string, instruction: string): string {
  // For most cases, use GPT-3.5 Turbo to avoid rate limits
  const defaultModel = "gpt-3.5-turbo"

  // For complex instructions or large HTML, consider using GPT-4o
  // but be cautious of rate limits
  if (instruction.length > 500 && html.length > 50000) {
    return "gpt-4o"
  }

  return defaultModel
}

/**
 * Parse and validate the AI-generated product data
 */
function parseProductData(text: string, url: string): ProductData {
  try {
    // Clean up the response to ensure it's valid JSON
    const cleanedText = text
      .trim()
      .replace(/```json|```/g, "")
      .trim()

    // Parse the JSON
    const parsedData = JSON.parse(cleanedText)

    // Create a new object with the source URL
    const result: ProductData = {
      sourceUrl: url,
    }

    // Copy all fields from parsedData, ensuring they're strings if they're objects
    Object.entries(parsedData).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        result[key] = typeof value === 'string' || typeof value === 'number' || value === null ? value : String(value)
      } else {
        result[key] = typeof value === 'string' || typeof value === 'number' || value === null ? value : String(value)
      }
    })

    return result
  } catch (parseError) {
    logger.error(`Error parsing AI response for ${url}:`, parseError)
    logger.debug(`Raw AI response: ${text}`)

    // Try to salvage partial data if possible
    try {
      // Clean up the response more aggressively
      const aggressiveCleanedText = text
        .trim()
        .replace(/```json|```/g, "")
        .replace(/[\r\n]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()

      // Try to find a valid JSON object within the text
      const jsonMatch = aggressiveCleanedText.match(/\{.*\}/)
      if (jsonMatch) {
        const extractedJson = jsonMatch[0]
        const salvageData = JSON.parse(extractedJson)
        logger.info(`Salvaged partial data from invalid response for ${url}`)

        // Create result with source URL
        const result: ProductData = {
          sourceUrl: url,
          _salvaged: "true",
        }

        // Copy all fields, ensuring they're strings if they're objects
        Object.entries(salvageData).forEach(([key, value]) => {
          if (typeof value === "object" && value !== null) {
        result[key] = typeof value === 'string' || typeof value === 'number' || value === null ? value : String(value)
          } else {
        result[key] = typeof value === 'string' || typeof value === 'number' || value === null ? value : String(value)
          }
        })

        return result
      }
    } catch (salvageError) {
      logger.error(`Failed to salvage data: ${salvageError}`)
    }

    // Return error object if parsing fails
    return { error: "Failed to parse extracted data", url }
  }
}

export async function extractDataWithAI(html: string, url: string, instruction: string): Promise<ProductData> {
  // Extract only the most relevant parts of the HTML to reduce token usage
  const relevantHtml = extractRelevantHtml(html, url)
  logger.info(`Preparing AI extraction for ${url} with ${relevantHtml.length} bytes of HTML`)

  // Generate site-specific prompt
  const prompt = generateSiteSpecificPrompt(url, instruction, relevantHtml)

  // Select appropriate model
  const model = selectAppropriateModel(relevantHtml, instruction)

  try {
    logger.info(`Sending request to AI model (${model}) for ${url}`)
    const startTime = Date.now()

    const { text } = await generateText({
      model: openai(model),
      prompt,
      temperature: 0.2,
      maxTokens: 2000, // Reduced from 4000
    })

    const duration = Date.now() - startTime
    logger.info(`AI response received in ${duration}ms for ${url}`)

    // Parse and validate the data
    return parseProductData(text, url)
  } catch (error) {
    logger.error(`Error calling AI model for ${url}:`, error)
    return { error: "AI extraction failed", url }
  }
}
