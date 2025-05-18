"use client"

import { useState, useEffect, useRef } from "react"
import { getExtractionProgress } from "@/app/actions"

interface ProgressData {
  currentUrl: string
  currentUrlIndex: number
  totalUrls: number
  status: string
  percent: number
  extractionId?: string
  lastUpdated?: number
}

interface ProgressTrackerProps {
  isExtracting: boolean
  onProgressUpdate: (progress: ProgressData) => void
  extractionId?: string
}

export default function ProgressTracker({ isExtracting, onProgressUpdate, extractionId }: ProgressTrackerProps) {
  const [connectionError, setConnectionError] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)
  const lastProgressRef = useRef<string>("")

  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    pollingActive: false,
    sseActive: false,
    lastUpdate: "",
  })

  useEffect(() => {
    // Set isActive to true when the component mounts
    isActiveRef.current = true

    return () => {
      // Set isActive to false when the component unmounts
      isActiveRef.current = false
    }
  }, [])

  // Direct polling function that doesn't rely on SSE
  const pollForProgress = async () => {
    if (!isActiveRef.current || !isExtracting) return

    try {
      const progress = await getExtractionProgress(extractionId)

      console.log("Direct poll progress:", progress)

      // Add this check before updating the UI with progress
      if (progress && typeof progress.percent === "number") {
        const progressJson = JSON.stringify(progress)

        if (progressJson !== lastProgressRef.current) {
          if (progress.percent === 100) {
            const confirmationCheck = fetch(`/api/progress?id=${extractionId}`)
            const confirmationData = confirmationCheck.then((response) => response.json())

            confirmationData
              .then((data) => {
                if (data.percent !== 100 || data.status !== "Extraction complete!") {
                  console.log("Received 100% but backend reports it's not complete yet. Ignoring update.")
                  return
                }
              })
              .catch((error) => {
                console.error("Error confirming completion status:", error)
                // If we can't confirm, don't update to 100%
                return
              })
          }

          lastProgressRef.current = progressJson
          console.log("UI update with progress:", progress)
          onProgressUpdate(progress)

          setDebugInfo((prev) => ({
            ...prev,
            lastUpdate: new Date().toISOString(),
          }))
        }
      }

      // Continue polling if extraction is still in progress
      if (isActiveRef.current && isExtracting && (!progress || progress.percent < 100)) {
        setTimeout(pollForProgress, 1000)
      }
    } catch (error) {
      console.error("Error in direct polling:", error)

      if (isActiveRef.current && isExtracting) {
        setTimeout(pollForProgress, 2000) // Longer delay on error
      }
    }
  }

  useEffect(() => {
    // Function to poll for progress updates as a fallback
    const startPolling = () => {
      console.log("Starting background polling...")
      setDebugInfo((prev) => ({ ...prev, pollingActive: true }))

      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

      pollIntervalRef.current = setInterval(async () => {
        if (!isActiveRef.current) return

        try {
          const progress = await getExtractionProgress(extractionId)
          console.log("Background poll progress:", progress)

          // Add this check before updating the UI with progress
          if (progress && typeof progress.percent === "number") {
            const progressJson = JSON.stringify(progress)

            if (progressJson !== lastProgressRef.current) {
              // Special handling for 100% - only update if we're sure it's complete
              if (progress.percent === 100) {
                // Double-check with a direct API call to confirm completion
                const confirmationCheck = fetch(`/api/progress?id=${extractionId}`)
                const confirmationData = confirmationCheck.then((response) => response.json())

                confirmationData
                  .then((data) => {
                    if (data.percent !== 100 || data.status !== "Extraction complete!") {
                      console.log("Received 100% but backend reports it's not complete yet. Ignoring update.")
                      return
                    }
                  })
                  .catch((error) => {
                    console.error("Error confirming completion status:", error)
                    // If we can't confirm, don't update to 100%
                    return
                  })
              }

              lastProgressRef.current = progressJson
              console.log("UI update with progress:", progress)
              onProgressUpdate(progress)

              setDebugInfo((prev) => ({
                ...prev,
                lastUpdate: new Date().toISOString(),
              }))
            }
          }

          // If extraction is complete, stop polling
          if (progress && progress.percent === 100) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
              setDebugInfo((prev) => ({ ...prev, pollingActive: false }))
            }
          }
        } catch (error) {
          console.error("Error polling for progress:", error)
        }
      }, 2000) // Poll every 2 seconds
    }

    // Function to set up SSE connection
    const setupSSE = () => {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      try {
        console.log("Setting up SSE connection...")
        const url = extractionId ? `/api/extraction-progress?id=${extractionId}` : "/api/extraction-progress"

        eventSourceRef.current = new EventSource(url)
        setDebugInfo((prev) => ({ ...prev, sseActive: true }))

        eventSourceRef.current.onopen = () => {
          console.log("SSE connection opened")
          setConnectionError(false)
        }

        eventSourceRef.current.onmessage = (event) => {
          if (!isActiveRef.current) return

          try {
            console.log("SSE message received:", event.data)
            const progress = JSON.parse(event.data)

            // Add this check before updating the UI with progress
            if (progress && typeof progress.percent === "number") {
              const progressJson = JSON.stringify(progress)

              if (progressJson !== lastProgressRef.current) {
                // Special handling for 100% - only update if we're sure it's complete
                if (progress.percent === 100) {
                  // Double-check with a direct API call to confirm completion
                  const confirmationCheck = fetch(`/api/progress?id=${extractionId}`)
                  const confirmationData = confirmationCheck.then((response) => response.json())

                  confirmationData
                    .then((data) => {
                      if (data.percent !== 100 || data.status !== "Extraction complete!") {
                        console.log("Received 100% but backend reports it's not complete yet. Ignoring update.")
                        return
                      }
                    })
                    .catch((error) => {
                      console.error("Error confirming completion status:", error)
                      // If we can't confirm, don't update to 100%
                      return
                    })
                }

                lastProgressRef.current = progressJson
                console.log("UI update with progress from SSE:", progress)
                onProgressUpdate(progress)

                setDebugInfo((prev) => ({
                  ...prev,
                  lastUpdate: new Date().toISOString(),
                }))
              }
            }

            // If extraction is complete, close the connection
            if (progress && progress.percent === 100) {
              if (eventSourceRef.current) {
                console.log("Extraction complete, closing SSE connection")
                eventSourceRef.current.close()
                eventSourceRef.current = null
                setDebugInfo((prev) => ({ ...prev, sseActive: false }))
              }
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error)
          }
        }

        eventSourceRef.current.onerror = (error) => {
          console.error("SSE connection error:", error)
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
            eventSourceRef.current = null
            setDebugInfo((prev) => ({ ...prev, sseActive: false }))
          }
          setConnectionError(true)
        }
      } catch (error) {
        console.error("Error setting up SSE:", error)
        setDebugInfo((prev) => ({ ...prev, sseActive: false }))
      }
    }

    if (isExtracting && isActiveRef.current) {
      // Start direct polling immediately
      pollForProgress()

      // Try SSE
      setupSSE()

      // Also start background polling as a backup
      startPolling()
    } else {
      // Clean up when not extracting
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setDebugInfo((prev) => ({ ...prev, sseActive: false }))
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        setDebugInfo((prev) => ({ ...prev, pollingActive: false }))
      }
    }

    return () => {
      // Clean up
      if (eventSourceRef.current) {
        console.log("Cleaning up SSE connection")
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      if (pollIntervalRef.current) {
        console.log("Clearing progress polling interval")
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isExtracting, extractionId, onProgressUpdate])

  // For debugging - render a hidden element with debug info
  if (process.env.NODE_ENV === "development") {
    return (
      <div className="hidden">
        <div data-testid="progress-tracker-debug">
          {JSON.stringify({
            isExtracting,
            extractionId,
            connectionError,
            ...debugInfo,
          })}
        </div>
      </div>
    )
  }

  return null
}
