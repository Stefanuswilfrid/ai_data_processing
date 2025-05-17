"use client"

import { useState, useEffect } from "react"
import { UrlInput } from "./inputs/url-input"
import { InstructionInput } from "./inputs/instruction-input"
import { Button } from "@/components/ui/button"
import { Loader2, Table, FileSpreadsheet, HelpCircle, AlertTriangle, Info } from "lucide-react"
import { extractProductData, cancelExtraction, resetCancellation } from "@/app/actions"
import { DataPreview } from "./data/data-preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ExtractionHistory } from "./data/extraction-history"
import { ErrorBoundary } from "./error-boundary"
import { SampleDataButton } from "./inputs/sample-data-button"
import { ExportOptions } from "./data/export-options"
import { KeyboardShortcuts } from "./keyboard-shortcuts"
import type { ProductData } from "@/lib/types"
import { useMobile } from "@/hooks/use-mobile"
import { Progress } from "@/components/ui/progress"

export function ProductDataExtractor() {
  const [urls, setUrls] = useState<string[]>([])
  const [instruction, setInstruction] = useState("")
  const [extractedData, setExtractedData] = useState<ProductData[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>("")
  const { toast } = useToast()
  const [history, setHistory] = useLocalStorage<{ date: string; urls: string[]; data: ProductData[] }[]>(
    "extraction-history",
    [],
  )
  const isMobile = useMobile()

  // Replace the progress tracking section with the previous implementation:

  // Progress tracking
  const [progress, setProgress] = useState({
    currentUrl: "",
    currentUrlIndex: 0,
    totalUrls: 0,
    status: "",
    percent: 0,
  })

  // Listen for progress updates from server
  useEffect(() => {
    const handleProgressUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "progress") {
          setProgress(data.progress)
          setProcessingStatus(data.progress.status)
        }
      } catch (e) {
        console.error("Error parsing progress event:", e)
      }
    }

    // Setup event source for progress updates
    let eventSource: EventSource | null = null

    if (isExtracting) {
      eventSource = new EventSource("/api/extraction-progress")
      eventSource.onmessage = handleProgressUpdate
      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close()
        }
      }
    }

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [isExtracting])

  // Simple client-side progress tracking
  // const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
  // const [totalUrls, setTotalUrls] = useState(0)
  // const [currentUrl, setCurrentUrl] = useState("")

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (urls.length > 0 && instruction && !isExtracting) {
          handleSubmit()
        }
      }

      // Escape to cancel extraction
      if (e.key === "Escape" && isExtracting) {
        handleCancel()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [urls, instruction, isExtracting])

  // Reset cancellation when component unmounts
  useEffect(() => {
    return () => {
      resetCancellation()
    }
  }, [])

  const handleSubmit = async () => {
    if (urls.length === 0) {
      setError("Please enter at least one URL")
      return
    }

    if (!instruction) {
      setError("Please enter extraction instructions")
      return
    }

    setError(null)
    setIsExtracting(true)
    setExtractedData([])
    setDownloadUrl(null)
    setShowSuccess(false)

    // Reset progress
    // setCurrentUrlIndex(0)
    // setTotalUrls(urls.length)
    // setCurrentUrl("")
    setProcessingStatus("Initializing extraction...")

    try {
      // Show warning for multiple URLs
      if (urls.length > 1) {
        toast({
          title: "Processing multiple URLs",
          description:
            "URLs will be processed one by one to ensure accurate data extraction. This may take a few minutes.",
          variant: "default",
          duration: 10000,
        })
      }

      // Set up a progress tracker using a worker or interval
      // let progressInterval: NodeJS.Timeout | null = null

      // if (urls.length > 1) {
      //   // Simulate progress updates for each URL
      //   progressInterval = setInterval(() => {
      //     // This is just a simulation - in a real app, you'd get actual progress from the server
      //     setCurrentUrlIndex((prev) => {
      //       // Don't exceed the actual number of URLs
      //       if (prev < urls.length) {
      //         setCurrentUrl(urls[prev])
      //         setProcessingStatus(`Processing ${urls[prev]}...`)
      //         return prev
      //       }
      //       return prev
      //     })
      //   }, 5000) // Update every 5 seconds
      // }

      const result = await extractProductData(urls, instruction)

      // Clear the interval when done
      // if (progressInterval) {
      //   clearInterval(progressInterval)
      // }

      setExtractedData(result.data)
      setDownloadUrl(result.downloadUrl)
      setShowSuccess(true)

      // Set progress to complete
      // setCurrentUrlIndex(urls.length)
      setProcessingStatus("Extraction complete!")

      // Count successful extractions
      const successCount = result.data.filter((item) => !item.error).length

      // Add to history
      setHistory([
        { date: new Date().toISOString(), urls, data: result.data },
        ...history.slice(0, 9), // Keep only last 10 extractions
      ])

      toast({
        title: "Data extraction complete",
        description: `Successfully extracted data from ${successCount}/${urls.length} URLs`,
        variant: successCount === urls.length ? "success" : "default",
      })
    } catch (err: any) {
      console.error(err)

      // Don't show error if it was cancelled
      if (err.message !== "Extraction cancelled") {
        setError("Failed to extract data. Please check your URLs and try again.")
        toast({
          variant: "destructive",
          title: "Extraction failed",
          description: "There was a problem extracting data from the provided URLs.",
        })
      } else {
        toast({
          title: "Extraction cancelled",
          description: "The data extraction process has been cancelled.",
          variant: "default",
        })
      }
    } finally {
      setIsExtracting(false)
    }
  }

  const handleCancel = async () => {
    if (isExtracting) {
      try {
        await cancelExtraction()
        toast({
          title: "Cancelling extraction...",
          description: "The data extraction process is being cancelled.",
          variant: "default",
        })
      } catch (error) {
        console.error("Error cancelling extraction:", error)
      }
    }
  }

  const handleUrlSelect = (url: string) => {
    setActiveUrl(url)
  }

  // Calculate estimated time based on number of URLs
  const getEstimatedTime = () => {
    if (urls.length <= 1) return "about 30 seconds"
    if (urls.length <= 3) return "1-3 minutes"
    if (urls.length <= 5) return "3-5 minutes"
    return "5+ minutes"
  }

  // Calculate progress percentage
  const progressPercent = progress.totalUrls > 0 ? Math.round((progress.currentUrlIndex / progress.totalUrls) * 100) : 0

  return (
    <ErrorBoundary>
      <KeyboardShortcuts />
      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"></path>
                      <path d="M4 2v16a2 2 0 0 0 2 2h16"></path>
                      <path d="M2 12h10"></path>
                      <path d="M12 2v10"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Product URLs</h2>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                        data-tour="help-urls"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Enter URLs from e-commerce sites like Coles, Woolworths, BWS, Kmart, Target, etc. You can add
                        multiple URLs to process in sequence.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-6">
                <UrlInput urls={urls} setUrls={setUrls} onUrlSelect={handleUrlSelect} activeUrl={activeUrl} />

                {urls.length > 1 && (
                  <Alert className="bg-amber-900/20 border-amber-800/50 text-amber-200">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      <span className="font-medium">Processing multiple URLs will take {getEstimatedTime()}</span>
                      <br />
                      <span className="text-xs">
                        URLs will be processed one at a time to ensure accurate data extraction.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                {urls.length > 3 && (
                  <Alert className="bg-blue-900/20 border-blue-800/50 text-blue-200">
                    <Info className="h-4 w-4 mr-2" />
                    <AlertDescription>
                      <span className="text-xs">
                        Tip: For faster results, process URLs in smaller batches of 2-3 at a time.
                      </span>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <SampleDataButton
                    onSelect={(sampleUrls) => {
                      setUrls(sampleUrls)
                      toast({
                        title: "Sample URLs added",
                        description: `Added ${sampleUrls.length} sample URLs`,
                      })
                    }}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-300 border-slate-700 hover:bg-slate-700"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? "Hide History" : "Show History"}
                  </Button>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path>
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Extraction Instructions</h2>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                        data-tour="help-instructions"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Tell the AI what data to extract. Be specific about fields like product name, price,
                        description, or specifications.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-6">
                <InstructionInput value={instruction} onChange={setInstruction} />

                {error && (
                  <Alert variant="destructive" className="bg-red-900/20 border-red-800 text-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="relative">
                  {isExtracting ? (
                    <div className="flex space-x-2">
                      <Button disabled className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting data... {progressPercent > 0 ? `${progressPercent}%` : ""}
                        </>
                      </Button>

                      <Button variant="destructive" onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isExtracting || urls.length === 0 || !instruction}
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                      data-tour="extract-button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
                      </svg>
                      Extract Product Data
                    </Button>
                  )}
                </div>

                {isExtracting && (
                  <div className="space-y-2 mt-4">
                    <Progress value={progress.percent > 0 ? progress.percent : 5} className="h-2" />

                    <div className="flex justify-between text-xs text-slate-400">
                      <span>
                        Processing URL {progress.currentUrlIndex + 1} of {progress.totalUrls}
                      </span>
                      <span>{progress.percent > 0 ? Math.round(progress.percent) : 5}%</span>
                    </div>

                    <div className="text-xs text-amber-300 text-center animate-pulse">{processingStatus}</div>

                    {progress.currentUrl && (
                      <div className="text-xs text-slate-400 truncate">
                        <span className="text-slate-500">Current URL:</span> {progress.currentUrl}
                      </div>
                    )}
                  </div>
                )}

                {!isExtracting && (
                  <div className="text-xs text-slate-400 text-center">
                    Pro tip: Press{" "}
                    <kbd className="px-1 py-0.5 bg-slate-700 rounded border border-slate-600 mx-1">Ctrl</kbd> +{" "}
                    <kbd className="px-1 py-0.5 bg-slate-700 rounded border border-slate-600 mx-1">Enter</kbd> to
                    extract data
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {showHistory ? (
              <ExtractionHistory
                history={history}
                onClose={() => setShowHistory(false)}
                onSelect={(item) => {
                  setUrls(item.urls)
                  setExtractedData(item.data)
                  setShowHistory(false)
                  toast({
                    title: "History item loaded",
                    description: "Previous extraction data has been loaded",
                  })
                }}
              />
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white">Instructions Guide</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-300 border-slate-700 hover:bg-slate-700"
                    data-tour="start-tour"
                  >
                    Start Tour
                  </Button>
                </div>

                <div className="space-y-6 text-slate-300">
                  <div className="space-y-4">
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                      <h3 className="font-medium text-white mb-2 flex items-center">
                        <span className="flex items-center justify-center bg-violet-600/20 text-violet-400 w-6 h-6 rounded-full text-xs mr-2">
                          1
                        </span>
                        Add Product URLs
                      </h3>
                      <p className="text-sm">
                        Enter URLs from e-commerce sites like Coles, Woolworths, BWS, Kmart, or Target. Add multiple
                        URLs to process in sequence.
                      </p>
                    </div>

                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                      <h3 className="font-medium text-white mb-2 flex items-center">
                        <span className="flex items-center justify-center bg-violet-600/20 text-violet-400 w-6 h-6 rounded-full text-xs mr-2">
                          2
                        </span>
                        Specify Instructions
                      </h3>
                      <p className="text-sm">
                        Tell the AI what data to extract. Be specific about fields like product name, price,
                        description, or specifications.
                      </p>
                    </div>

                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
                      <h3 className="font-medium text-white mb-2 flex items-center">
                        <span className="flex items-center justify-center bg-violet-600/20 text-violet-400 w-6 h-6 rounded-full text-xs mr-2">
                          3
                        </span>
                        Extract & Download
                      </h3>
                      <p className="text-sm">
                        Click "Extract Product Data" and wait for processing. Review the extracted data and download as
                        Excel, CSV, or JSON.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-xl p-4">
                      <h3 className="font-medium text-white mb-2 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-2 text-indigo-400"
                        >
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                        Pro Tips
                      </h3>
                      <ul className="text-sm space-y-2 text-slate-300">
                        <li className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          Use the template selector for common extraction patterns
                        </li>
                        <li className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          For best results, be specific about the exact fields you need
                        </li>
                        <li className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          Process URLs in smaller batches of 2-3 at a time
                        </li>
                        <li className="flex items-start">
                          <span className="text-indigo-400 mr-2">•</span>
                          Use keyboard shortcuts for faster workflow
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {(isExtracting || extractedData.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl"
            data-tour="results-section"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <h2 className="text-xl font-semibold text-white">Extracted Data</h2>
              </div>
              {downloadUrl && !isMobile && (
                <ExportOptions
                  downloadUrl={downloadUrl}
                  data={extractedData}
                  onExport={(format) => {
                    toast({
                      title: `Exported as ${format.toUpperCase()}`,
                      description: "Your data has been exported successfully",
                      variant: "success",
                    })
                  }}
                />
              )}
            </div>

            {isExtracting ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-indigo-200/30 border-t-indigo-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-indigo-400"
                    >
                      <path d="m8 3 4 8 5-5 5 15H2L8 3z"></path>
                    </svg>
                  </div>
                </div>
                <p className="mt-6 text-slate-300 font-medium">Extracting data from URLs...</p>
                <p className="text-sm text-slate-400 mt-2 max-w-md text-center">
                  {processingStatus ||
                    "Our AI is analyzing the content and extracting structured data according to your instructions."}
                </p>
                <div className="w-full max-w-md mt-6 bg-slate-700/30 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percent > 0 ? progress.percent : 5}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {progress.percent > 0 ? Math.round(progress.percent) : 5}% complete
                </p>
                {progress.totalUrls > 1 && (
                  <p className="text-xs text-slate-400 mt-4">
                    Processing URL {progress.currentUrlIndex + 1} of {progress.totalUrls}
                    <br />
                    <span className="text-amber-400">This may take {getEstimatedTime()} to complete all URLs</span>
                  </p>
                )}
              </div>
            ) : extractedData.length > 0 ? (
              <>
                {showSuccess && (
                  <div className="mb-6 bg-emerald-900/20 border border-emerald-800/50 rounded-xl p-4 text-emerald-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-400"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">
                          Extraction complete. {extractedData.filter((item) => !item.error).length} of{" "}
                          {extractedData.length} URLs processed successfully.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {extractedData.some((item) => item.error) && (
                  <div className="mb-6 bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 text-amber-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-0.5">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">Some URLs could not be processed</p>
                        <p className="mt-1 text-xs">
                          Try processing fewer URLs at once (2-3 maximum) or try again later.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isMobile && downloadUrl && (
                  <div className="mb-4">
                    <ExportOptions
                      downloadUrl={downloadUrl}
                      data={extractedData}
                      onExport={(format) => {
                        toast({
                          title: `Exported as ${format.toUpperCase()}`,
                          description: "Your data has been exported successfully",
                          variant: "success",
                        })
                      }}
                    />
                  </div>
                )}

                <Tabs defaultValue="table" className="w-full">
                  <TabsList className="mb-4 bg-slate-700/50 border border-slate-600/50">
                    <TabsTrigger
                      value="table"
                      className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                    >
                      <Table className="h-4 w-4 mr-2" />
                      Table View
                    </TabsTrigger>
                    <TabsTrigger
                      value="json"
                      className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                    >
                      JSON View
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="table">
                    <div className="overflow-x-auto">
                      <DataPreview data={extractedData} />
                    </div>
                  </TabsContent>
                  <TabsContent value="json">
                    <pre className="bg-slate-900/50 p-4 rounded-xl overflow-x-auto text-sm text-slate-300 border border-slate-700/50">
                      {JSON.stringify(extractedData, null, 2)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </>
            ) : null}
          </motion.div>
        )}
      </div>
    </ErrorBoundary>
  )
}
