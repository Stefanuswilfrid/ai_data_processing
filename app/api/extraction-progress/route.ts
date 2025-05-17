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
          const progress = await getExtractionProgress()

          // Format the data as an SSE event
          const data = `data: ${JSON.stringify({ type: "progress", progress })}

`

          try {
            controller.enqueue(new TextEncoder().encode(data))
          } catch (error) {
            console.error("Error enqueueing data:", error)
            return // Exit the function if we can't enqueue
          }

          // Continue sending updates if not complete
          if (progress.percent < 100) {
            setTimeout(sendProgress, 1000)
          } else {
            // Send one final update
            try {
              setTimeout(() => {
                try {
                  controller.enqueue(
                    new TextEncoder().encode(`data: ${JSON.stringify({ type: "complete" })}

`),
                  )
                  controller.close()
                } catch (closeError) {
                  console.error("Error sending final update:", closeError)
                }
              }, 2000)
            } catch (error) {
              console.error("Error setting timeout for final update:", error)
            }
          }
        } catch (error) {
          console.error("Error sending progress:", error)
          try {
            controller.error(error)
          } catch (controllerError) {
            console.error("Error calling controller.error:", controllerError)
          }
        }
      }

      // Start sending progress updates
      sendProgress()
    },
  })

  return new Response(stream, { headers })
}
