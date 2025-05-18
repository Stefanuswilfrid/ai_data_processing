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

  // For debugging, allow a simple JSON response
  const format = url.searchParams.get("format")
  if (format === "json") {
    const progress = await getExtractionProgress(extractionId)
    return NextResponse.json(progress)
  }

  // Set headers for SSE
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Accel-Buffering": "no", // Disable buffering for Nginx
  }

  // Create a new ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      let lastProgressJson = ""
      let isActive = true
      let consecutiveErrors = 0
      const maxConsecutiveErrors = 5

      // For debugging
      console.log(`Starting SSE stream for extraction ${extractionId}`)

      // Function to check if controller is still active
      const isControllerActive = () => {
        return isActive && controller && typeof controller.enqueue === "function"
      }

      // Function to safely enqueue data
      const safeEnqueue = (data: string): boolean => {
        if (!isControllerActive()) return false

        try {
          controller.enqueue(new TextEncoder().encode(data))
          return true
        } catch (error) {
          console.error("Error enqueueing data:", error)
          isActive = false
          return false
        }
      }

      // Send an initial message to establish the connection
      const initialData = `data: ${JSON.stringify({
        currentUrl: "",
        currentUrlIndex: 0,
        totalUrls: 0,
        status: "Connecting to extraction progress...",
        percent: 0,
      })}\n\n`

      if (!safeEnqueue(initialData)) {
        return // Exit if we can't send the initial message
      }

      // Immediately fetch and send the current progress
      try {
        const initialProgress = await getExtractionProgress(extractionId || undefined)
        if (initialProgress && typeof initialProgress.percent === "number") {
          const data = `data: ${JSON.stringify(initialProgress)}\n\n`
          safeEnqueue(data)
          lastProgressJson = JSON.stringify(initialProgress)
          console.log(`Initial progress sent: ${initialProgress.percent}% - ${initialProgress.status}`)
        }
      } catch (error) {
        console.error("Error fetching initial progress:", error)
      }

      // Function to send progress updates
      const sendProgress = async () => {
        if (!isControllerActive()) return

        try {
          // Get current progress
          const progress = await getExtractionProgress(extractionId || undefined)

          // Ensure we have valid data
          if (!progress) {
            throw new Error("No progress data available")
          }

          const progressJson = JSON.stringify(progress)

          // Only send update if progress has changed
          if (progressJson !== lastProgressJson) {
            lastProgressJson = progressJson
            const data = `data: ${progressJson}\n\n`

            if (safeEnqueue(data)) {
              console.log(`Progress sent via SSE: ${progress.percent}% - ${progress.status}`)
              // Reset error counter on successful update
              consecutiveErrors = 0
            } else {
              return // Exit if we can't enqueue
            }
          }

          // If extraction is complete (100%), close the stream
          if (progress.percent === 100) {
            // Send one final update
            const finalData = `data: ${JSON.stringify({ ...progress, status: "Complete" })}\n\n`
            safeEnqueue(finalData)
            console.log("Final progress update sent")

            // Close the stream after a short delay to ensure the client receives the final update
            setTimeout(() => {
              try {
                isActive = false
                if (controller) {
                  controller.close()
                  console.log("Stream controller closed")
                }
              } catch (closeError) {
                console.error("Error closing controller:", closeError)
              }
            }, 1000)
            return
          }

          // Schedule the next update only if controller is still active
          if (isControllerActive()) {
            setTimeout(sendProgress, 500) // Poll every 500ms
          }
        } catch (error) {
          console.error("Error sending progress:", error)
          consecutiveErrors++

          if (isControllerActive()) {
            try {
              // Send error to client
              const errorData = `data: ${JSON.stringify({
                error: "Error fetching progress",
                details: String(error),
                consecutiveErrors,
              })}\n\n`

              safeEnqueue(errorData)

              // Close the stream if we've had too many consecutive errors
              if (consecutiveErrors >= maxConsecutiveErrors) {
                console.error(`Too many consecutive errors (${consecutiveErrors}), closing stream`)
                isActive = false
                controller.close()
                return
              }

              // Don't close the controller, just try again with increasing delay
              const delay = Math.min(1000 * Math.pow(1.5, consecutiveErrors), 10000) // Exponential backoff with 10s max
              setTimeout(sendProgress, delay)
            } catch (closeError) {
              console.error("Error sending error message:", closeError)
              isActive = false
            }
          }
        }
      }

      // Start sending progress updates
      await sendProgress()
    },
    cancel() {
      console.log(`Client disconnected from SSE stream for extraction ${extractionId}`)
    },
  })

  // Return the stream as the response
  return new NextResponse(stream, { headers })
}
