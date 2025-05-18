import { logger } from "./logger"

interface BrowseAIResponse {
  success: boolean
  data?: {
    productName?: string
    price?: string
    description?: string
    // Add other fields you need
    [key: string]: any
  }
  error?: string
}

export async function extractWithBrowseAI(url: string): Promise<any> {
  logger.info(`Starting Browse.AI extraction for ${url}`)

  try {
    // Replace with your Browse.AI API key and robot ID
    const API_KEY = process.env.BROWSE_AI_API_KEY
    const ROBOT_ID = process.env.BROWSE_AI_ROBOT_ID

    if (!API_KEY || !ROBOT_ID) {
      throw new Error("Browse.AI API key or Robot ID not configured")
    }

    // Call Browse.AI API to run the robot
    const response = await fetch(`https://api.browse.ai/v2/robots/${ROBOT_ID}/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        // Optional parameters for your robot
        options: {
          waitForSelectors: [".product-details", ".product-name"],
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Browse.AI API error: ${response.status} ${response.statusText}`)
    }

    const result: BrowseAIResponse = await response.json()

    if (!result.success) {
      throw new Error(`Browse.AI extraction failed: ${result.error}`)
    }

    logger.info(`Successfully extracted data with Browse.AI for ${url}`)
    return result.data
  } catch (error) {
    logger.error(`Error extracting with Browse.AI: ${error}`)
    throw new Error(`Browse.AI extraction failed: ${error}`)
  }
}
