"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { logger } from "@/lib/utils/logger"
import type { ProductData } from "@/lib/types"

// Reduce token usage by extracting only the most relevant parts of HTML
function extractRelevantHtml(html: string, url: string): string {
  // Focus on the main product content by looking for common product page patterns
  let relevantHtml = html

  try {
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

export async function extractDataWithAI(html: string, url: string, instruction: string): Promise<ProductData> {
  // Extract only the most relevant parts of the HTML to reduce token usage
  const relevantHtml = extractRelevantHtml(html, url)
  logger.info(`Preparing AI extraction for ${url} with ${relevantHtml.length} bytes of HTML`)

  // Create a more focused prompt to reduce token usage
  const prompt = `
Extract structured data from this e-commerce product page.

URL: ${url}

INSTRUCTIONS:
${instruction}

Extract ONLY the following key information in JSON format:
- Product Name
- Price (regular and sale if available)
- Brand
- Description (keep it brief)
- Key Specifications
- Image URL (if found)

HTML CONTENT:
${relevantHtml}

Return ONLY a valid JSON object with the extracted data. No explanations or markdown.
`

  try {
    logger.info(`Sending request to AI model for ${url}`)
    const startTime = Date.now()

    // Use a more efficient model if available
    const model = "gpt-3.5-turbo" // Using GPT-3.5 instead of GPT-4o to reduce token usage and rate limits

    const { text } = await generateText({
      model: openai(model),
      prompt,
      temperature: 0.2,
      maxTokens: 2000, // Reduced from 4000
    })

    const duration = Date.now() - startTime
    logger.info(`AI response received in ${duration}ms for ${url}`)

    // Parse the JSON response
    try {
      // Clean up the response to ensure it's valid JSON
      const cleanedText = text
        .trim()
        .replace(/```json|```/g, "")
        .trim()
      const parsedData = JSON.parse(cleanedText)

      // Add the source URL to the data
      return { ...parsedData, sourceUrl: url }
    } catch (parseError) {
      logger.error(`Error parsing AI response for ${url}:`, parseError)
      logger.debug(`Raw AI response: ${text}`)
      return { error: "Failed to parse extracted data", url }
    }
  } catch (error) {
    logger.error(`Error calling AI model for ${url}:`, error)
    return { error: "AI extraction failed", url }
  }
}
