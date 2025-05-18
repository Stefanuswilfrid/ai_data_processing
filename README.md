# E-commerce Product Data Extractor

A powerful tool for extracting structured product data from e-commerce websites using AI. This application can handle various e-commerce sites including Coles, Woolworths, Kmart, and more.

![Product Data Extractor](public/images/screenshot.png)

## Features

- Extract product data from multiple e-commerce websites
- Process multiple URLs in sequence
- Export data to Excel, CSV, or JSON
- View extraction history
- Responsive design for desktop and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT models via AI SDK
- **Data Processing**: XLSX for spreadsheet generation
- **State Management**: React Hooks and Server Actions

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- OpenAI API key

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
```

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Stefanuswilfrid/ai_data_processing.git
   cd ai_data_processing
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. **Enter Product URLs**: Add one or more URLs from supported e-commerce sites.
2. **Specify Instructions**: Tell the AI what data to extract (e.g., product name, price, description).
3. **Extract Data**: Click "Extract Product Data" and wait for the process to complete.
4. **View Results**: Review the extracted data in table or JSON format.
5. **Export Data**: Download the data in Excel, CSV, or JSON format.

## Supported Websites

The application can extract data from various e-commerce websites, including:

- Coles
- Woolworths
- Amazon
- JB Hifi
- Kmart
- Target
- And many more...

## Limitations

## 🚫 Limitations

### BWS Extraction

BWS uses strong anti-scraping protections, making full data extraction difficult.

- **Current**: Extracts basic info from the URL and enriches with limited API data
- **Failed Approaches**: Browse.AI, Puppeteer (even with stealth), and direct API access
- **Potential Improvements**: Host Puppeteer on a private server with rotating residential proxies

---

### Progress Tracking

Progress updates are always reliable.

- **Uses**: Server-Sent Events (SSE) with polling fallback
- **Issues**: progress isnt real time
- **Potential Improvements**: Use upstash(redis) so that progress is sync between backend and frontend

## Project Structure

```
├── app/ # Next.js App Router
│ ├── actions.ts # Server Actions
│ ├── api/ # API Routes
│ └── page.tsx # Main page
├── components/ # React components
│ ├── data/ # Data display components
│ ├── inputs/ # Form input components
│ └── ui/ # UI components (shadcn)
├── lib/ # Utility functions
│ ├── types.ts # TypeScript types
│ └── utils/ # Utility functions
│ ├── bws-extractor.ts # BWS-specific extraction
│ ├── data-parser.ts # Parse AI responses
│ ├── html-extractor.ts # Extract relevant HTML
│ ├── logger.ts # Logging utility
│ └── prompt-generator.ts # Generate AI prompts
├── public/ # Static assets
└── .env.local # Environment variables
```

## Manual Testing

For manual testing, you can use the sample URLs provided in the application. These URLs are pre-configured to test different extraction scenarios.

## Limitations

- Some websites may block automated access, resulting in limited data extraction.
- The AI extraction quality depends on the structure and consistency of the source website.
- Processing multiple URLs may take several minutes.

## Manual Testing Guide

To help evaluate this project, here's how to test it effectively:

### Guided Tour Feature

The application includes a guided tour for first-time users:

1. Click the "Start Tour" button in the Instructions Guide section
2. The tour will highlight key features and explain how to use them
3. You can exit the tour at any time by clicking outside the highlighted area

### Sample Data and Templates

For easy testing:

1. Click the "Sample Data" button to load pre-configured URLs
2. Use the template selector in the Extraction Instructions section for common extraction patterns
3. The AI Generate button can create extraction instructions based on the type of product

### Common Issues

1. **Extraction fails for certain websites**:

   - Check if the website has anti-scraping measures.

2. **OpenAI API errors**:

   - Verify your API key is correct and has sufficient credits.
   - Check for rate limiting issues.
