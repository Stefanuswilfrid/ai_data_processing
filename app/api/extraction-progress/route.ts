import { NextResponse } from "next/server"
import { getExtractionProgress } from "@/app/actions"

export async function GET() {
  // Set headers for SSE
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  }

  // Create a new ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      // Function to send progress updates
      const sendProgress = async () => {
        try {
          // Get current progress
          const progress = await getExtractionProgress()
          const data = `data: ${JSON.stringify(progress)}\n\n`

          // Check if controller is still active before enqueueing
          if (controller.desiredSize !== null) {
            try {
              controller.enqueue(new TextEncoder().encode(data))
            } catch (error) {
              console.error("Error enqueueing data:", error)
              return // Exit the function if we can't enqueue
            }
          } else {
            console.log("Stream controller is no longer active")
            return // Exit if controller is no longer active
          }

          // If extraction is complete (100%), close the stream
          if (progress.percent === 100) {
            // Send one final update
            try {
              const finalData = `data: ${JSON.stringify({ ...progress, status: "Complete" })}\n\n`
              controller.enqueue(new TextEncoder().encode(finalData))
            } catch (error) {
              console.error("Error sending final update:", error)
            }

            // Close the stream after a short delay to ensure the client receives the final update
            setTimeout(() => {
              try {
                controller.close()
              } catch (error) {
                console.error("Error closing controller:", error)
              }
            }, 1000)
            return
          }

          // Schedule the next update
          setTimeout(sendProgress, 500)
        } catch (error) {
          console.error("Error sending progress:", error)

          try {
            // Send error to client
            const errorData = `data: ${JSON.stringify({ error: "Error fetching progress" })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorData))
            controller.close()
          } catch (closeError) {
            console.error("Error closing controller after error:", closeError)
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
