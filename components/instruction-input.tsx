"use client"

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { motion } from "framer-motion"

interface InstructionInputProps {
  value: string
  onChange: (value: string) => void
}

const exampleInstructions = [
  {
    label: "Basic Product Info",
    value: "Extract the following information: Product Name, Price, Brand, Description, Image URL, and Availability.",
  },
  {
    label: "Grocery Products",
    value:
      "Extract the following information: Product Name, Regular Price, Sale Price (if any), Weight/Volume, Price per unit (e.g., $/kg), Nutritional Information (calories, protein, fat, carbs), and Ingredients list.",
  },
  {
    label: "Electronics",
    value:
      "Extract the following information: Product Name, Brand, Model Number, Price, Key Specifications, Warranty Information, Available Colors, and Customer Rating.",
  },
  {
    label: "Clothing",
    value:
      "Extract the following information: Product Name, Brand, Price, Available Sizes, Available Colors, Material Composition, Care Instructions, and Product Category.",
  },
]

export function InstructionInput({ value, onChange }: InstructionInputProps) {
  const [selectedExample, setSelectedExample] = useState<string>("")
  const [isFocused, setIsFocused] = useState(false)

  const handleExampleSelect = (example: string) => {
    setSelectedExample(example)
    const selectedInstruction = exampleInstructions.find((instruction) => instruction.label === example)
    if (selectedInstruction) {
      onChange(selectedInstruction.value)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label htmlFor="instruction" className="text-sm font-medium text-slate-300">
          Data Extraction Instructions
        </Label>
        <Select value={selectedExample} onValueChange={handleExampleSelect}>
          <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-800/70 border-slate-700 text-slate-300 focus:ring-indigo-500 focus:ring-offset-0 focus:ring-offset-transparent">
            <SelectValue placeholder="Example templates" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 text-slate-300">
            {exampleInstructions.map((instruction) => (
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
