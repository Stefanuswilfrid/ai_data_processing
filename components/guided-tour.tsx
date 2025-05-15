"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { X, ChevronRight, ChevronLeft } from "lucide-react"
import { useLocalStorage } from "@/hooks/use-local-storage"

const tourSteps = [
    {
      target: '[data-tour="url-input"]',
      content:
        "Enter the URLs of product pages you want to extract data from. You can add multiple URLs to process in batch.",
      title: "Add Product URLs",
      placement: "bottom",
    },
    {
      target: '[data-tour="add-url"]',
      content: "Click this button to add the URL to your list.",
      title: "Add URL",
      placement: "bottom",
    },
    {
      target: '[data-tour="sample-data"]',
      content: "Not sure where to start? Click here to load sample product URLs.",
      title: "Sample Data",
      placement: "right",
    },
    {
      target: '[data-tour="instruction-input"]',
      content:
        "Tell the AI what data you want to extract from the product pages. Be specific about fields like name, price, description, etc.",
      title: "Extraction Instructions",
      placement: "top",
    },
    {
      target: '[data-tour="template-selector"]',
      content: "Choose from pre-defined templates for common extraction patterns.",
      title: "Instruction Templates",
      placement: "left",
    },
    {
      target: '[data-tour="extract-button"]',
      content:
        "Click this button to start the extraction process. Our AI will analyze the product pages and extract the requested data.",
      title: "Extract Data",
      placement: "top",
    },
    {
      target: '[data-tour="export-options"]',
      content:
        "Once extraction is complete, you can download your data in various formats including Excel, CSV, and JSON.",
      title: "Export Options",
      placement: "left",
    },
]

export function GuidedTour() {
    const [currentStep, setCurrentStep] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [targetElement, setTargetElement] = useState<Element | null>(null)
    const [hasSeenTour, setHasSeenTour] = useState(false)
    const [tourCompleted, setTourCompleted] = useLocalStorage("tour-completed", false)
  
    useEffect(() => {
      // Check if this is the user's first visit
      if (!tourCompleted && !hasSeenTour) {
        const timer = setTimeout(() => {
          setIsOpen(true)
          setHasSeenTour(true)
        }, 2000)
  
        return () => clearTimeout(timer)
      }
  
      // Handle tour start button click
      const handleStartTour = (e: MouseEvent) => {
        const target = e.target as Element
        if (target.closest('[data-tour="start-tour"]')) {
          setCurrentStep(0)
          setIsOpen(true)
        }
      }
  
      document.addEventListener("click", handleStartTour)
      return () => document.removeEventListener("click", handleStartTour)
    }, [tourCompleted, hasSeenTour])
  
    useEffect(() => {
      if (isOpen) {
        const target = document.querySelector(tourSteps[currentStep].target)
        setTargetElement(target)
      }
    }, [currentStep, isOpen])
  
    const handleNext = () => {
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep((prev) => prev + 1)
      } else {
        handleClose()
      }
    }
  
    const handlePrev = () => {
      if (currentStep > 0) {
        setCurrentStep((prev) => prev - 1)
      }
    }
  
    const handleClose = () => {
      setIsOpen(false)
      setTourCompleted(true)
    }
  
    if (!isOpen || !targetElement) return null
  
    const step = tourSteps[currentStep]
    const rect = targetElement.getBoundingClientRect()
  
    // Calculate tooltip position based on placement
    let tooltipStyle: React.CSSProperties = {}
    const offset = 12
  
    switch (step.placement) {
      case "top":
        tooltipStyle = {
          top: rect.top - offset,
          left: rect.left + rect.width / 2,
          transform: "translate(-50%, -100%)",
        }
        break
      case "bottom":
        tooltipStyle = {
          top: rect.bottom + offset,
          left: rect.left + rect.width / 2,
          transform: "translateX(-50%)",
        }
        break
      case "left":
        tooltipStyle = {
          top: rect.top + rect.height / 2,
          left: rect.left - offset,
          transform: "translate(-100%, -50%)",
        }
        break
      case "right":
        tooltipStyle = {
          top: rect.top + rect.height / 2,
          left: rect.right + offset,
          transform: "translateY(-50%)",
        }
        break
    }
  
    // Add highlight to target element
    const highlightStyle: React.CSSProperties = {
      position: "absolute",
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
      borderRadius: "8px",
      boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5)",
      zIndex: 50,
      pointerEvents: "none",
    }
  
    return createPortal(
      <AnimatePresence>
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Highlight */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={highlightStyle} />
  
          {/* Tooltip */}
          <motion.div
            className="absolute z-50 pointer-events-auto"
            style={tooltipStyle}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 w-72">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-white">{step.title}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-700 -mt-1 -mr-1"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-slate-300 mb-4">{step.content}</p>
              <div className="flex justify-between items-center">
                <div className="text-xs text-slate-400">
                  Step {currentStep + 1} of {tourSteps.length}
                </div>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={handleNext}>
                    {currentStep < tourSteps.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      "Finish"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>,
      document.body,
    )
  }
  