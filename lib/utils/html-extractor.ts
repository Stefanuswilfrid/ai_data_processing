import { logger } from "./logger"

/**
 * Extract the most relevant parts of HTML for product information
 */
export function extractRelevantHtml(html: string, url: string): string {
  // Focus on the main product content by looking for common product page patterns
  let relevantHtml = html

  try {
    // First, try to identify the site type to use specialized extraction
    const domain = new URL(url).hostname.toLowerCase()

    // Site-specific extraction patterns
    if (domain.includes("woolworths.com.au")) {
      return extractWoolworthsProductHtml(html)
    } else if (domain.includes("coles.com.au")) {
      return extractColesProductHtml(html)
    } else if (domain.includes("kmart.com.au")) {
      return extractKmartProductHtml(html)
    } else if (domain.includes("target.com.au")) {
      return extractTargetProductHtml(html)
    } else if (domain.includes("bws.com.au")) {
      return extractBwsProductHtml(html)
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
    const maxLength = 30000
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
export function extractWoolworthsProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch = html.match(/<div[^>]*class=["']?product-details[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product title and price
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

    // Extract specifications
    const specsMatch = html.match(/<div[^>]*class=["']?specifications[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (specsMatch && specsMatch[0]) {
      extractedParts += specsMatch[0]
    }

    if (extractedParts.length > 500) {
      return extractedParts
    }
  } catch (e) {
    logger.warn(`Error in Woolworths extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

export function extractColesProductHtml(html: string): string {
  try {
    // For Coles, we'll take a different approach - just return the entire HTML
    // This ensures we don't miss any important data
    // We'll let the AI model extract the relevant information

    // Just clean up the HTML to remove scripts and styles
    const cleanedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")

    // Truncate to a reasonable size
    return cleanedHtml.substring(0, 50000)
  } catch (e) {
    logger.warn(`Error in Coles extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

function extractKmartProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch = html.match(/<div[^>]*class=["']?pdp-details[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product information sections
    let extractedParts = ""

    // Extract product title
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
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
    logger.warn(`Error in Kmart extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

function extractTargetProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch = html.match(/<div[^>]*class=["']?product-details[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product information sections
    let extractedParts = ""

    // Extract product title
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
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
    logger.warn(`Error in Target extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}

function extractBwsProductHtml(html: string): string {
  try {
    // Try to extract product details section
    const productDetailsMatch = html.match(/<div[^>]*class=["']?product-details[^"']*["']?[^>]*>([\s\S]*?)<\/div>/i)
    if (productDetailsMatch && productDetailsMatch[1] && productDetailsMatch[1].length > 500) {
      return productDetailsMatch[1]
    }

    // Try to extract product information sections
    let extractedParts = ""

    // Extract product title
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
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
    logger.warn(`Error in BWS extraction: ${e}`)
  }

  // Fallback to generic extraction
  return html.substring(0, 30000)
}
