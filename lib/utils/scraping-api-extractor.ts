import { logger } from "./logger"

export async function extractWithScrapingAPI(url: string): Promise<string> {
  logger.info(`Starting ScrapingAPI extraction for ${url}`)

  try {
    const API_KEY = process.env.SCRAPING_API_KEY

    if (!API_KEY) {
      throw new Error("ScrapingAPI key not configured")
    }

    // Build the API URL with parameters
    const apiUrl = new URL("https://api.scrapingbee.com/v1/")
    apiUrl.searchParams.append("api_key", API_KEY)
    apiUrl.searchParams.append("url", url)
    apiUrl.searchParams.append("render_js", "true")
    apiUrl.searchParams.append("premium_proxy", "true")

    if (url.includes("bws.com.au")) {
      apiUrl.searchParams.append("wait", "5000") // Wait for content to load
      apiUrl.searchParams.append("wait_for", ".product-details, .product-name")
    }

    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
    })

    if (!response.ok) {
      throw new Error(`ScrapingAPI error: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    logger.info(`Successfully extracted HTML with ScrapingAPI for ${url} (${html.length} bytes)`)
    return html
  } catch (error) {
    logger.error(`Error extracting with ScrapingAPI: ${error}`)
    throw new Error(`ScrapingAPI extraction failed: ${error}`)
  }
}
