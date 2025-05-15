"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import type { ProductData } from "@/lib/types"
import { motion } from "framer-motion"
import { Clock, X, ArrowUpRight } from "lucide-react"

interface ExtractionHistoryProps {
  history: { date: string; urls: string[]; data: ProductData[] }[]
  onClose: () => void
  onSelect: (item: { date: string; urls: string[]; data: ProductData[] }) => void
}

export function ExtractionHistory({ history, onClose, onSelect }: ExtractionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-semibold text-white">Extraction History</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-slate-300 mb-2">No extraction history yet</p>
            <p className="text-sm text-slate-400">Your extraction history will appear here</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg shadow-indigo-500/20">
            <Clock className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-semibold text-white">Extraction History</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 -mr-4 pr-4">
        <div className="space-y-3">
          {history.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50 hover:bg-slate-700/50 transition-colors cursor-pointer group"
              onClick={() => onSelect(item)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm font-medium text-slate-200">
                  {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white hover:bg-slate-700"
                >
                  <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-slate-400 mb-3">
                {item.urls.length} URLs • {item.data.length} items extracted
              </div>
              <div className="text-xs text-slate-500 truncate">
                {item.urls[0]}
                {item.urls.length > 1 && ` and ${item.urls.length - 1} more`}
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
