"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { logger } from "@/lib/utils/logger"
import type { ProductData } from "@/lib/types"

export async function extractDataWithAI(html: string, url: string, instruction: string): Promise<ProductData> {
  const truncatedHtml = html.length > 100000 ? html.substring(0, 100000) : html
  logger.info(`Preparing AI extraction for ${url} with ${truncatedHtml.length} bytes of HTML`)

  const prompt = `
You are a web scraping expert. Extract structured data from the following e-commerce product page HTML.

URL: ${url}

INSTRUCTIONS:
${instruction}

Extract the data in a structured JSON format with appropriate field names. 
Only include fields that you can find in the HTML.
For prices, extract numerical values when possible.
For images, extract the full URL path.

HTML CONTENT:
${truncatedHtml}

Return ONLY a valid JSON object with the extracted data. Do not include any explanations or markdown formatting.
`

  try {
    logger.info(`Sending request to AI model for ${url}`)
    const startTime = Date.now()

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.2,
      maxTokens: 4000,
    })

    const duration = Date.now() - startTime
    logger.info(`AI response received in ${duration}ms for ${url}`)

    try {
      const cleanedText = text
        .trim()
        .replace(/```json|```/g, "")
        .trim()
      const parsedData = JSON.parse(cleanedText)

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
