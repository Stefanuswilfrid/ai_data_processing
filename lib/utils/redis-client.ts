import { Redis } from "@upstash/redis"

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

export interface ProgressData {
  currentUrl: string
  currentUrlIndex: number
  totalUrls: number
  status: string
  percent: number
  lastUpdated: number
  extractionId?: string
}

// Generate a unique ID for each extraction
export function generateExtractionId(): string {
  return `extraction-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Store progress in Redis
export async function storeProgress(
  extractionId: string,
  progress: Omit<ProgressData, "extractionId" | "lastUpdated">,
): Promise<void> {
  const progressData: ProgressData = {
    ...progress,
    lastUpdated: Date.now(),
    extractionId,
  }

  // Ensure we're storing a JSON string
  const jsonString = JSON.stringify(progressData)

  // Store progress with 30 minute expiration
  await redis.set(`progress:${extractionId}`, jsonString, { ex: 1800 })

  // Also store the latest extraction ID for easy retrieval
  await redis.set("latest-extraction-id", extractionId, { ex: 1800 })

  console.log(`Progress stored in Redis: ${progress.percent}% - ${progress.status}`)
}

export async function getProgress(extractionId: string): Promise<ProgressData | null> {
  const data = await redis.get<string | ProgressData>(`progress:${extractionId}`)
  if (!data) return null

  try {
    // Check if data is already an object
    if (typeof data === "object") {
      return data as ProgressData
    }

    // Otherwise parse it as JSON
    return JSON.parse(data) as ProgressData
  } catch (error) {
    console.error("Error parsing progress data from Redis:", error)
    return null
  }
}

// Get the latest extraction ID
export async function getLatestExtractionId(): Promise<string | null> {
  return redis.get<string>("latest-extraction-id")
}

// Check if an extraction is active (updated in the last 5 minutes)
export async function isExtractionActive(extractionId: string): Promise<boolean> {
  const progress = await getProgress(extractionId)
  if (!progress) return false

  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  return progress.lastUpdated > fiveMinutesAgo && progress.percent < 100
}

// Mark extraction as cancelled
export async function cancelExtraction(extractionId: string): Promise<void> {
  const progress = await getProgress(extractionId)
  if (!progress) return

  await storeProgress(extractionId, {
    ...progress,
    status: "Cancelled",
    percent: 100,
  })
}

export default redis
