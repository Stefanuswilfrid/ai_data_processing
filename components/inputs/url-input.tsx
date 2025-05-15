"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Plus, X, ExternalLink, Link2, Clipboard } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { validateUrl } from "@/lib/utils/validator"

interface UrlInputProps {
  urls: string[]
  setUrls: (urls: string[]) => void
  onUrlSelect: (url: string) => void
  activeUrl: string | null
}

export function UrlInput({ urls, setUrls, onUrlSelect, activeUrl }: UrlInputProps) {
  const [currentUrl, setCurrentUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleAddUrl = () => {
    if (!currentUrl.trim()) {
      setError("URL cannot be empty")
      return
    }

    if (!validateUrl(currentUrl)) {
      setError("Please enter a valid URL")
      return
    }

    if (urls.includes(currentUrl)) {
      setError("This URL has already been added")
      return
    }

    setUrls([...urls, currentUrl])
    setCurrentUrl("")
    setError(null)

    // Set as active URL if it's the first one
    if (urls.length === 0) {
      onUrlSelect(currentUrl)
    }

    toast({
      title: "URL added",
      description: "The URL has been added to the list",
    })
  }

  const handleRemoveUrl = (urlToRemove: string) => {
    const newUrls = urls.filter((url) => url !== urlToRemove)
    setUrls(newUrls)

    // If the active URL was removed, select another one
    if (activeUrl === urlToRemove && newUrls.length > 0) {
      onUrlSelect(newUrls[0])
    } else if (newUrls.length === 0) {
      onUrlSelect(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddUrl()
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (validateUrl(text)) {
        setCurrentUrl(text)
        toast({
          title: "URL pasted",
          description: "URL has been pasted from clipboard",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Invalid URL",
          description: "The clipboard content is not a valid URL",
        })
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Paste failed",
        description: "Could not access clipboard",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="url-input" className="text-sm font-medium text-slate-300">
        Product URLs
      </Label>

      <div className={`flex gap-2 relative ${isFocused ? "z-10" : ""}`}>
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <Link2 className="h-4 w-4" />
          </div>
          <Input
            id="url-input"
            ref={inputRef}
            placeholder="https://example.com/product"
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
              isFocused ? "ring-2 ring-indigo-500 border-indigo-500" : ""
            }`}
            data-tour="url-input"
          />
        </div>
        <Button
          type="button"
          onClick={handlePaste}
          variant="outline"
          className="bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          title="Paste from clipboard"
        >
          <Clipboard className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          onClick={handleAddUrl}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
          data-tour="add-url"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-red-300 text-sm bg-red-900/20 p-2 rounded-md border border-red-800/50"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {urls.length > 0 && (
        <div className="border border-slate-700/50 rounded-xl p-3 bg-slate-800/30" data-tour="url-list">
          <Label className="text-xs text-slate-400 mb-3 block">Added URLs ({urls.length})</Label>
          <ScrollArea className="h-[120px] pr-4">
            <div className="space-y-2">
              {urls.map((url, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between group rounded-lg p-2 hover:bg-slate-700/30 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge
                      variant={activeUrl === url ? "default" : "outline"}
                      className={`cursor-pointer ${
                        activeUrl === url
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-600"
                      }`}
                      onClick={() => onUrlSelect(url)}
                    >
                      {index + 1}
                    </Badge>
                    <span className="truncate text-sm flex-1 text-slate-300" title={url}>
                      {url}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white hover:bg-slate-700"
                      onClick={() => window.open(url, "_blank")}
                      title="Open URL"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300 hover:bg-red-900/30"
                      onClick={() => handleRemoveUrl(url)}
                      title="Remove URL"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Enter URLs to product pages from e-commerce websites like Coles, Woolworths, BWS, Kmart, Target, etc.
      </p>
    </div>
  )
}
