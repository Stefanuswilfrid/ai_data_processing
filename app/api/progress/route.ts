import { NextResponse } from "next/server"
import { getExtractionProgress } from "@/app/actions"
import { getLatestExtractionId } from "@/lib/utils/redis-client"

export async function GET(request: Request) {
  // Get the extraction ID from the query parameters
  const url = new URL(request.url)
  let extractionId = url.searchParams.get("id")

  // If no extraction ID is provided, get the latest one
  if (!extractionId) {
    extractionId = await getLatestExtractionId()
    if (!extractionId) {
      return NextResponse.json({ error: "No active extraction found" }, { status: 404 })
    }
  }

  try {
    const progress = await getExtractionProgress(extractionId)
    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json({ error: "Failed to fetch progress", details: String(error) }, { status: 500 })
  }
}
