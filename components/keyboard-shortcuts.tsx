"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, Keyboard } from "lucide-react"

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "?") {
        setIsOpen(true)
      }

      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  if (!isOpen) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Keyboard className="h-5 w-5 mr-2 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">General</h3>
              <div className="bg-slate-700/30 rounded-lg">
                <div className="flex justify-between items-center p-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-300">Show keyboard shortcuts</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-300">
                      Shift
                    </kbd>
                    <span className="text-slate-500">+</span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-300">
                      ?
                    </kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2">
                  <span className="text-sm text-slate-300">Close dialogs</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-300">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">Data Extraction</h3>
              <div className="bg-slate-700/30 rounded-lg">
                <div className="flex justify-between items-center p-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-300">Extract data</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-300">
                      Ctrl
                    </kbd>
                    <span className="text-slate-500">+</span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-300">
                      Enter
                    </kbd>
                  </div>
                </div>
                <div className="flex justify-between items-center p-2">
                  <span className="text-sm text-slate-300">Add URL</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-slate-700 rounded border border-slate-600 text-xs text-slate-300">
                      Enter
                    </kbd>
                    <span className="text-slate-500">(in URL field)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs text-slate-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-slate-700 rounded border border-slate-600 mx-1">Shift</kbd> +{" "}
            <kbd className="px-1 py-0.5 bg-slate-700 rounded border border-slate-600 mx-1">?</kbd> anytime to show this
            dialog
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
