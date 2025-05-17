/**
 * Generate a prompt tailored to the specific e-commerce site
 */
export function generateEcommercePrompt(url: string, instruction: string, html: string): string {
  const domain = new URL(url).hostname.toLowerCase()

  // Base prompt template that prioritizes user instructions
  let promptTemplate = `
You are a specialized e-commerce data extraction expert. Extract structured product data from this product page.

URL: ${url}

USER INSTRUCTIONS:
${instruction}

IMPORTANT EXTRACTION GUIDELINES:
- Extract EXACTLY the data fields requested in the user instructions above
- Do NOT add fields that weren't requested unless they're essential
- For price fields, extract the CURRENT selling price with currency symbol
- Format prices as strings with currency symbols (e.g., "$1,299.99")
- If there are multiple prices shown, use the actual current selling price, not RRP/MSRP
- Return all data in a clean JSON format

HTML CONTENT:
${html}

Return ONLY a valid JSON object with the extracted data. No explanations or markdown.
`

  // Site-specific prompt enhancements (only add minimal guidance, don't override user instructions)
  if (domain.includes("woolworths.com.au") || domain.includes("coles.com.au")) {
    promptTemplate += `

SITE-SPECIFIC TIPS (only if relevant to user's request):
- For grocery items, pay attention to price per unit (e.g., $/kg)
- Weight/volume information is often part of the product name
- Look for any special offers or multi-buy deals
`
  } else if (domain.includes("amazon.com")) {
    promptTemplate += `

SITE-SPECIFIC TIPS (only if relevant to user's request):
- Check for "Deal of the Day" or special pricing
- Amazon often shows multiple prices (list price, deal price)
- Look for Prime-specific pricing if mentioned
`
  }

  return promptTemplate
}
