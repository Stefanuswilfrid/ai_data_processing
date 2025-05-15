"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { INSTRUCTION_TEMPLATES } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InstructionInputProps {
  value: string
  onChange: (value: string) => void
}

export function InstructionInput({ value, onChange }: InstructionInputProps) {
  const [selectedExample, setSelectedExample] = useState<string>("")
  const [isFocused, setIsFocused] = useState(false)
  const { toast } = useToast()

  const handleExampleSelect = useCallback((example: string) => {
    if (selectedExample === example) return // prevent loop
    setSelectedExample(example)

    const selectedInstruction = INSTRUCTION_TEMPLATES.find((instruction) => instruction.label === example)
    if (selectedInstruction) {
      onChange(selectedInstruction.value)
      toast({
        title: "Template applied",
        description: `Applied the "${selectedInstruction.label}" template`,
      })
    }
  }, [selectedExample, onChange, toast])

  const handleGenerateInstructions = useCallback(() => {
    // This would ideally call an AI endpoint to generate custom instructions
    // For now, we'll just use a template as a placeholder
    const randomTemplate = INSTRUCTION_TEMPLATES[Math.floor(Math.random() * INSTRUCTION_TEMPLATES.length)]
    onChange(randomTemplate.value)
    setSelectedExample(randomTemplate.label)
    toast({
      title: "AI-generated instructions",
      description: "Custom instructions have been generated based on common extraction patterns",
    })
  }, [onChange, toast])

  // Only update selectedExample if value changes and doesn't match current selection
  useEffect(() => {
    const matched = INSTRUCTION_TEMPLATES.find((t) => t.value === value)
    // Only update if we’re not already matching
    if (matched && selectedExample !== matched.label) {
      setSelectedExample(matched.label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]) // ✅ intentionally leave selectedExample out
  
  

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label htmlFor="instruction" className="text-sm font-medium text-slate-300">
          Data Extraction Instructions
        </Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            onClick={handleGenerateInstructions}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI Generate
          </Button>
          <Select value={selectedExample} onValueChange={handleExampleSelect}>
            <SelectTrigger
              className="w-[180px] h-8 text-xs bg-slate-800/70 border-slate-700 text-slate-300 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-offset-transparent"
              data-tour="template-selector"
            >
              <SelectValue placeholder="Example templates" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-300">
              {INSTRUCTION_TEMPLATES.map((instruction) => (
                <SelectItem
                  key={instruction.label}
                  value={instruction.label}
                  className="focus:bg-indigo-600 focus:text-white"
                >
                  {instruction.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <Textarea
          id="instruction"
          placeholder="Specify what data you want to extract from the product pages..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`min-h-[120px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
            isFocused ? "ring-2 ring-indigo-500 border-indigo-500" : ""
          }`}
          data-tour="instruction-input"
        />

        {value && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 right-2"
          >
            <span className="inline-flex items-center rounded-full bg-indigo-600/20 px-2 py-1 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-600/30">
              {value.length} chars
            </span>
          </motion.div>
        )}
      </div>

      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
        <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
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
            <path d="m15 9-6 6"></path>
            <path d="m9 9 6 6"></path>
          </svg>
          Instruction Tips
        </h4>
        <p className="text-xs text-slate-400">
          Be specific about what data you want to extract and how it should be structured. For example: "Extract product
          name, price, description, and image URL. For grocery items, also include weight and price per unit."
        </p>
      </div>
    </div>
  )
}
