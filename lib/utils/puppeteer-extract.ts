import puppeteer from "puppeteer"
import { logger } from "./logger"

interface ExtractionResult {
  content: string
  screenshots?: {
    initial?: string
    afterWait?: string
    final?: string
  }
}

/**
 * Extract HTML content using Puppeteer (headless browser)
 * This bypasses anti-scraping measures by fully rendering the page with JavaScript
 * @param url The URL to extract content from
 * @param captureScreenshots Whether to capture screenshots during extraction (default: false)
 */
export async function extractWithPuppeteer(url: string): Promise<string> {
  logger.info(`Starting Puppeteer extraction for ${url}`)

  let browser = null
  try {
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920x1080",
        
      ],
    })

    // Open a new page
    const page = await browser.newPage()

    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    )

    // Set viewport size
    await page.setViewport({ width: 1920, height: 1080 })

    // Enable JavaScript
    await page.setJavaScriptEnabled(true)

    // Add extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      Referer: "https://www.google.com/",
    })

    // Navigate to the URL with a timeout of 30 seconds
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    })

    // Wait for the main content to load
    // Adjust these selectors based on the specific site
    try {
      if (url.includes("coles.com.au")) {
        await page.waitForSelector(".product-details", { timeout: 10000 })
      } else if (url.includes("bws.com.au")) {
        await page.waitForSelector(".product-details, .product-name", { timeout: 10000 })
      } else {
        // Generic wait for any content
        await page.waitForSelector("main, #content, .product, article", { timeout: 10000 })
      }
    } catch (e) {
      logger.warn(`Timeout waiting for content selectors, continuing anyway: ${e}`)
      // Continue anyway, we'll get whatever content is available
    }

    // Add a small delay to ensure dynamic content loads
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Get the page content
    const content = await page.content()

    logger.info(`Successfully extracted content with Puppeteer (${content.length} bytes)`)
    return content
  } catch (error) {
    logger.error(`Error extracting with Puppeteer: ${error}`)
    throw new Error(`Puppeteer extraction failed: ${error}`)
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close()
      logger.info("Puppeteer browser closed")
    }
  }
}

/**
 * Check if a URL should use Puppeteer for extraction
 */
export function shouldUsePuppeteer(url: string): boolean {
  const domain = new URL(url).hostname.toLowerCase()

  // List of domains that need Puppeteer
  const puppeteerDomains = [
    "bws.com.au",
    "danmurphys.com.au",
    "liquorland.com.au",
    "firstchoiceliquor.com.au",
  ]

  return puppeteerDomains.some((d) => domain.includes(d))
}
