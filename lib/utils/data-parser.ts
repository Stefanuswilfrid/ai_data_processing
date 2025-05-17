import { logger } from "./logger"
import type { ProductData } from "@/lib/types"

/**
 * Parse and validate the AI-generated product data
 */
export function parseProductData(text: string, url: string): ProductData {
  try {
    // Clean up the response to ensure it's valid JSON
    const cleanedText = text
      .trim()
      .replace(/```json|```/g, "")
      .trim()

    // Parse the JSON
    const parsedData = JSON.parse(cleanedText)

    // Add source URL
    const result: ProductData = {
      sourceUrl: url,
    }

    // Copy all fields from parsedData, ensuring they're strings if they're objects
    Object.entries(parsedData).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        // Convert objects to strings
        if (Array.isArray(value)) {
          // If it's an array, join it with commas
          result[key] = value.join(", ")
        } else {
          // If it's an object, stringify it in a readable format
          try {
            // Try to convert object to a readable string format
            const entries = Object.entries(value)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
            result[key] = entries
          } catch (e) {
            // Fallback to JSON.stringify if the above fails
            result[key] = JSON.stringify(value)
          }
        }
      } else {
        result[key] = value
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

        // Create a new result object with source URL
        const result: ProductData = {
          sourceUrl: url,
          _salvaged: true,
        }

        // Copy all fields, ensuring they're strings if they're objects
        Object.entries(salvageData).forEach(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            // Convert objects to strings
            if (Array.isArray(value)) {
              // If it's an array, join it with commas
              result[key] = value.join(", ")
            } else {
              // If it's an object, stringify it in a readable format
              try {
                // Try to convert object to a readable string format
                const entries = Object.entries(value)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ")
                result[key] = entries
              } catch (e) {
                // Fallback to JSON.stringify if the above fails
                result[key] = JSON.stringify(value)
              }
            }
          } else {
            result[key] = value
          }
        })

        return result
      }
    } catch (salvageError) {
      logger.error(`Failed to salvage data: ${salvageError}`)
    }

    // For Coles URLs specifically, provide a fallback with basic information
    try {
      const domain = new URL(url).hostname.toLowerCase()
      if (domain.includes("coles.com.au")) {
        // Extract product name from URL
        const urlPath = new URL(url).pathname
        const productNameMatch = urlPath.match(/\/product\/(.+?)(?:\/|-|$)/)
        const productName = productNameMatch
          ? productNameMatch[1].replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
          : "Coles Product"

        return {
          productName,
          sourceUrl: url,
          _salvaged: true,
          error: "Partial data only - extraction failed",
        }
      }
    } catch (e) {
      logger.error(`Failed to create fallback for Coles product: ${e}`)
    }

    // Return error object if parsing fails
    return { error: "Failed to parse extracted data", url }
  }
}
