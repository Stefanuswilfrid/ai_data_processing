"use client"

import { Progress } from "@/components/ui/progress"
import { useEffect, useState } from "react"

interface ProgressDisplayProps {
  isExtracting: boolean
  progress: {
    currentUrl: string
    currentUrlIndex: number
    totalUrls: number
    status: string
    percent: number
  }
  getEstimatedTime: () => string
}

export function ExtractionProgressDisplay({ isExtracting, progress, getEstimatedTime }: ProgressDisplayProps) {
  const [displayPercent, setDisplayPercent] = useState(0)

  useEffect(() => {
    if (!isExtracting) {
      setDisplayPercent(0)
      return
    }

    const targetPercent =
      progress.percent === 100 && !progress.status.includes("complete") && !progress.status.includes("Complete")
        ? 99
        : progress.percent

    // Gradually approach the target percent for smoother UI
    const timer = setInterval(() => {
      setDisplayPercent((current) => {
        if (current < targetPercent) {
          return Math.min(current + 1, targetPercent)
        } else if (current > targetPercent + 1) {
          return current - 1
        }
        return current
      })
    }, 50)

    return () => clearInterval(timer)
  }, [isExtracting, progress.percent, progress.status])

  if (!isExtracting) return null

  // Calculate progress percentage with fallback
  const progressPercent = displayPercent > 0 ? displayPercent : 5

  return (
    <div className="space-y-2 mt-4">
      <Progress value={progressPercent} className="h-2" />

      <div className="flex justify-between text-xs text-slate-400">
        <span>
          Processing URL {progress.currentUrlIndex + 1} of {progress.totalUrls}
        </span>
        <span>{Math.round(progressPercent)}%</span>
      </div>

      <div className="text-xs text-amber-300 text-center animate-pulse">{progress.status || "Processing..."}</div>

      {progress.currentUrl && (
        <div className="text-xs text-slate-400 truncate">
          <span className="text-slate-500">Current URL:</span> {progress.currentUrl}
        </div>
      )}

      {progress.totalUrls > 1 && (
        <p className="text-xs text-slate-400 mt-4">
          Processing URL {progress.currentUrlIndex + 1} of {progress.totalUrls}
          <br />
          <span className="text-amber-400">This may take {getEstimatedTime()} to complete all URLs</span>
        </p>
      )}
    </div>
  )
}
