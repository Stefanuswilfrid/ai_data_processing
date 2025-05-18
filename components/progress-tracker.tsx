"use client"

import { useState, useEffect } from "react"
import { getExtractionProgress } from "@/app/actions"

interface ProgressData {
  currentUrl: string
  currentUrlIndex: number
  totalUrls: number
  status: string
  percent: number
}

interface ProgressTrackerProps {
  isExtracting: boolean
  onProgressUpdate: (progress: ProgressData) => void
}

export default function ProgressTracker({ isExtracting, onProgressUpdate }: ProgressTrackerProps) {
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null

    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const progress = await getExtractionProgress()
          console.log("Polled progress:", progress)
          onProgressUpdate(progress)

          if (progress.percent >= 100) {
            clearInterval(pollInterval!)
          }
        } catch (error) {
          console.error("Error polling for progress:", error)
        }
      }, 1000)
    }

    if (isExtracting) {
      startPolling()
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [isExtracting, onProgressUpdate])

  return null
}
