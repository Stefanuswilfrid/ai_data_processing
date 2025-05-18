import { logger } from "./logger"
import type { ProductData } from "@/lib/types"

export function extractBwsProductInfo(url: string): ProductData | null {
  try {
    // Check if it's a BWS URL
    if (!url.includes("bws.com.au")) {
      return null
    }

    logger.info(`Extracting BWS product info from URL: ${url}`)

    // Extract product ID from URL
    const productIdMatch = url.match(/\/products?\/([^/]+)/)
    const productId = productIdMatch ? productIdMatch[1] : null

    if (!productId) {
      logger.warn(`Could not extract product ID from BWS URL: ${url}`)
      return null
    }

    // Extract product name from URL path (after the product ID)
    const productNameMatch = url.match(/\/products?\/[^/]+\/([^?]+)/)
    let productName = productNameMatch ? productNameMatch[1].replace(/-/g, " ") : productId.replace(/-/g, " ")

    // Capitalize first letter of each word
    productName = productName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    // Extract additional info from URL parameters
    const urlObj = new URL(url)
    const params = Object.fromEntries(urlObj.searchParams)

    // Try to extract price from URL if available
    const priceMatch = url.match(/\$([0-9]+(\.[0-9]+)?)/)
    const price = priceMatch ? priceMatch[1] : null

    // Try to extract volume/size from product name or URL
    const volumeMatch =
      productName.match(/(\d+(\.\d+)?)\s*(ml|l|litre|liter)/i) || url.match(/(\d+(\.\d+)?)\s*(ml|l|litre|liter)/i)
    const volume = volumeMatch ? volumeMatch[0] : null

    // Try to extract alcohol percentage
    const alcoholMatch = productName.match(/(\d+(\.\d+)?)\s*%/) || url.match(/(\d+(\.\d+)?)\s*%/)
    const alcoholPercentage = alcoholMatch ? alcoholMatch[0] : null

    // Determine category from URL path
    const categoryMatch = url.match(/bws\.com\.au\/([^/]+)\//)
    let category = categoryMatch ? categoryMatch[1].replace(/-/g, " ") : null

    // Capitalize category
    if (category) {
      category = category
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    }

    // Create product data object
    const productData: ProductData = {
      productId,
      productName,
      sourceUrl: url,
      _salvaged: true,
      category,
      price: price ? `$${price}` : undefined,
      volume,
      alcoholPercentage,
      ...params, // Include any URL parameters as additional data
    }

    logger.info(`Successfully extracted BWS product info: ${JSON.stringify(productData)}`)
    return productData
  } catch (error) {
    logger.error(`Error extracting BWS product info: ${error}`)
    return null
  }
}

// Add a function to fetch additional data from BWS API if available
export async function enrichBwsProductData(productId: string): Promise<Partial<ProductData>> {
  try {
    // BWS has a product API that might be accessible
    const apiUrl = `https://api.bws.com.au/apis/ui/product/${productId}`

    logger.info(`Attempting to enrich BWS data from API: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      logger.warn(`BWS API returned ${response.status}: ${response.statusText}`)
      return {}
    }

    const data = await response.json()
    logger.info(`Successfully retrieved BWS API data for product ${productId}`)

    // Extract relevant fields from API response
    return {
      productName: data.name || undefined,
      price: data.price?.value ? `$${data.price.value}` : undefined,
      description: data.description,
      brand: data.brand,
      images: data.images?.map((img: any) => img.url),
      volume: data.volume?.value ? `${data.volume.value}${data.volume.unitCode}` : undefined,
      alcoholPercentage: data.alcoholPercentage ? `${data.alcoholPercentage}%` : undefined,
      // Add any other fields available in the API
    }
  } catch (error) {
    logger.warn(`Could not enrich BWS product data: ${error}`)
    return {}
  }
}
