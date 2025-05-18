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
- IMPORTANT: For nutritional information, ingredients, or any complex data, return it as a SIMPLE STRING, not as an object or nested structure
- For nutritional information, format it as a simple comma-separated string (e.g., "Energy: 100kJ, Protein: 5g, Fat: 2g")
- For ingredients, format as a simple comma-separated string (e.g., "Sugar, Cocoa Butter, Milk Solids")

HTML CONTENT:
${html}

Return ONLY a valid JSON object with the extracted data. No explanations or markdown.
`

  // Site-specific prompt enhancements (only add minimal guidance, don't override user instructions)
  if (domain.includes("coles.com.au")) {
    promptTemplate = `
You are a specialized e-commerce data extraction expert for Coles supermarket products.

URL: ${url}

USER INSTRUCTIONS:
${instruction}

IMPORTANT EXTRACTION GUIDELINES:
- Extract EXACTLY the data fields requested in the user instructions above
- Do NOT add fields that weren't requested unless they're essential
- Format all data according to the user's instructions

COLES WEBSITE STRUCTURE GUIDE (to help you locate the requested information):
- Product name is typically in the h1 tag (e.g., "Coca-Cola Classic Soft Drink Can | 250mL")
- Regular price is often shown as "Was $X.XX" (e.g., "Was $2.65")
- Current/sale price is displayed with dollar sign (e.g., "$2.10")
- Price per unit is in format "$X.XX per L" or "$X.XX/kg" (e.g., "$8.40 per L")
- Weight/volume is often part of the product name or near the price
- Nutritional information is in a table with columns for "Per 100g/ml", "Per Serving", and "%DI"
- Ingredients are in their own section labeled "Ingredients"

FORMATTING GUIDELINES:
- Format prices as strings with currency symbols (e.g., "$1,299.99")
- Format nutritional information as a simple string (e.g., "Energy: 180kJ per 100ml, Protein: 0g, Carbohydrate: 10.6g")
- Format ingredients as a simple comma-separated string (e.g., "Carbonated Water, Sugar, Colour (150d)")
- Return all data in a clean JSON format with ONLY the fields requested by the user

HTML CONTENT:
${html}

Return ONLY a valid JSON object with the extracted data. No explanations or markdown.
`
  } else if (domain.includes("woolworths.com.au")) {
    promptTemplate += `

SITE-SPECIFIC TIPS (only if relevant to user's request):
- Look for the product name in the page title or main heading
- Current price is usually displayed prominently, often with a dollar sign
- For sale items, look for both the current price and the "was" price
- Weight/volume is often part of the product name (e.g., "180g")
- Price per unit (e.g., $22.22/kg) is usually displayed near the price
- Remember to format nutritional information as a simple string, not as an object
`
  } else if (domain.includes("bws.com.au")) {
    promptTemplate = `
You are a specialized e-commerce data extraction expert for BWS (Beer Wine Spirits) products.

URL: ${url}

USER INSTRUCTIONS:
${instruction}

IMPORTANT NOTE:
The BWS website has anti-scraping measures that prevent direct access. We have limited data available from the URL.
Based on the information provided, extract as much data as possible that matches the user's instructions.

EXTRACTION GUIDELINES:
- Extract EXACTLY the data fields requested in the user instructions above
- Do NOT add fields that weren't requested
- The data available is limited to what can be extracted from the URL and product name
- Some requested fields may not be available due to website restrictions
- Return all data in a clean JSON format with ONLY the fields requested by the user

HTML CONTENT (LIMITED):
${html}

Return ONLY a valid JSON object with the extracted data. No explanations or markdown.
Include a note field explaining that data is limited due to website restrictions.
`
  }

  return promptTemplate
}
