"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface AspectRatioSelectorProps {
  value: string
  onChange: (value: string) => void
}

const aspectRatios = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Vertical (9:16)" },
]

export function AspectRatioSelector({ value, onChange }: AspectRatioSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">Aspect Ratio</Label>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-2">
        {aspectRatios.map((ratio) => (
          <div key={ratio.value} className="flex items-center space-x-2">
            <RadioGroupItem value={ratio.value} id={`ratio-${ratio.value}`} />
            <Label htmlFor={`ratio-${ratio.value}`} className="text-sm">
              {ratio.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}
