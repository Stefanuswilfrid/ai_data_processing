import { NextResponse } from "next/server"
import { getExtractionProgress } from "@/app/actions"

export async function GET() {
  // Set headers for SSE
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }

  // Create a new ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      let lastProgressJson = ""
      let isActive = true

      // Function to send progress updates
      const sendProgress = async () => {
        if (!isActive) return

        try {
          // Get current progress
          const progress = await getExtractionProgress()
          const progressJson = JSON.stringify(progress)

          // Only send update if progress has changed
          if (progressJson !== lastProgressJson) {
            lastProgressJson = progressJson
            const data = `data: ${progressJson}\n\n`

            try {
              controller.enqueue(new TextEncoder().encode(data))
              console.log(`Progress sent: ${progress.percent}% - ${progress.status}`)
            } catch (error) {
              console.error("Error enqueueing data:", error)
              isActive = false
              return // Exit if we can't enqueue
            }
          }

          // If extraction is complete (100%), close the stream
          if (progress.percent === 100) {
            // Send one final update
            try {
              const finalData = `data: ${JSON.stringify({ ...progress, status: "Complete" })}\n\n`
              controller.enqueue(new TextEncoder().encode(finalData))
              console.log("Final progress update sent")
            } catch (error) {
              console.error("Error sending final update:", error)
            }

            // Close the stream after a short delay to ensure the client receives the final update
            setTimeout(() => {
              try {
                isActive = false
                controller.close()
                console.log("Stream controller closed")
              } catch (error) {
                console.error("Error closing controller:", error)
              }
            }, 1000)
            return
          }

          // Schedule the next update
          setTimeout(sendProgress, 200) // Poll more frequently
        } catch (error) {
          console.error("Error sending progress:", error)

          try {
            // Send error to client
            const errorData = `data: ${JSON.stringify({ error: "Error fetching progress" })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorData))

            // Don't close the controller, just try again
            setTimeout(sendProgress, 1000)
          } catch (closeError) {
            console.error("Error sending error message:", closeError)
            isActive = false
          }
        }
      }

      // Start sending progress updates
      await sendProgress()
    },
  })

  // Return the stream as the response
  return new NextResponse(stream, { headers })
}
