"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle, AlertCircle } from "lucide-react"

type ToastVariant = "default" | "destructive" | "success"

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

export function useToast(): ToastContextValue {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, ...options }])

    // Auto dismiss
    const duration = options.duration || 5000
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }

  // Toast component
  const ToastContainer = () => {
    return createPortal(
      <div className="fixed bottom-0 right-0 p-4 z-50 flex flex-col items-end space-y-2 max-w-md w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`w-full bg-slate-800 border rounded-lg shadow-lg p-4 flex items-start gap-3 ${
                toast.variant === "destructive"
                  ? "border-red-800"
                  : toast.variant === "success"
                    ? "border-green-800"
                    : "border-slate-700"
              }`}
            >
              {toast.variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />}
              {toast.variant === "success" && <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-white">{toast.title}</h3>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {toast.description && <p className="text-sm text-slate-300 mt-1">{toast.description}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>,
      document.body,
    )
  }

  useEffect(() => {
    // Only render if there are toasts
    if (toasts.length > 0) {
      const container = document.createElement("div")
      container.id = "toast-container"
      document.body.appendChild(container)

      return () => {
        document.body.removeChild(container)
      }
    }
  }, [toasts.length > 0])

  // Render toasts
  if (typeof window !== "undefined" && toasts.length > 0) {
    return {
      toast,
      ToastContainer: <ToastContainer />,
    }
  }

  return { toast }
}
