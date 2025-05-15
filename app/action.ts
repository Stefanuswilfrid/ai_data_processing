"use server"

import { revalidatePath } from "next/cache"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import * as XLSX from "xlsx"
import { put } from "@vercel/blob"

export async function transformImage(
  imageUrl: string,
  prompt: string,
  aspectRatio: string,
): Promise<{ imageUrl: string }> {
  // Placeholder implementation - replace with actual image transformation logic
  console.log("Transforming image:", imageUrl, prompt, aspectRatio)
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate processing time
  const transformedImageUrl = `/transformed_${imageUrl.split("/").pop()}` // Simulate a transformed URL
  return { imageUrl: transformedImageUrl }
}

export async function uploadToBlob(file: File): Promise<string> {
  // Placeholder implementation - replace with actual blob upload logic
  console.log("Uploading file:", file)
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate upload time
  const blobUrl = `/blob/${file.name}` // Simulate a blob URL
  return blobUrl
}

export async function extractProductData(
  urls: string[],
  instruction: string,
): Promise<{ data: any[]; downloadUrl: string }> {
  // Process each URL
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        // Fetch the HTML content
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
        }

        const html = await response.text()

        // Use AI to extract structured data from the HTML
        const extractedData = await extractDataWithAI(html, url, instruction)
        return extractedData
      } catch (error) {
        console.error(`Error processing ${url}:`, error)
        return { error: `Failed to process ${url}`, url }
      }
    }),
  )

  // Filter out errors and format the data
  const validResults = results.filter((result) => !result.error)

  // Generate Excel file
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(validResults)
  XLSX.utils.book_append_sheet(workbook, worksheet, "Product Data")

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })

  // Upload to Vercel Blob
  const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const file = new File([blob], "product_data.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const { url } = await put(`product_data_${Date.now()}.xlsx`, file, {
    access: "public",
  })

  revalidatePath("/")
  return { data: validResults, downloadUrl: url }
}

async function extractDataWithAI(html: string, url: string, instruction: string) {
  // Truncate HTML if it's too long (GPT has token limits)
  const truncatedHtml = html.length > 100000 ? html.substring(0, 100000) : html

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
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.2,
      maxTokens: 4000,
    })

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
      console.error("Error parsing AI response:", parseError)
      console.log("Raw response:", text)
      return { error: "Failed to parse extracted data", url }
    }
  } catch (error) {
    console.error("Error calling AI model:", error)
    return { error: "AI extraction failed", url }
  }
}
