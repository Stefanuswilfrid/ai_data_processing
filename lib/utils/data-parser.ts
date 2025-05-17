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
    return {
      ...parsedData,
      sourceUrl: url,
    }
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
        return { ...salvageData, sourceUrl: url, _salvaged: true }
      }
    } catch (salvageError) {
      logger.error(`Failed to salvage data: ${salvageError}`)
    }

    // Return error object if parsing fails
    return { error: "Failed to parse extracted data", url }
  }
}
