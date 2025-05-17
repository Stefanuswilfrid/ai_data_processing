"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SAMPLE_URLS } from "@/lib/constants"
import { Database } from "lucide-react"

interface SampleDataButtonProps {
  onSelect: (urls: string[]) => void
}

export function SampleDataButton({ onSelect }: SampleDataButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-slate-300 border-slate-700 hover:bg-slate-700"
          data-tour="sample-data"
        >
          <Database className="h-3 w-3 mr-1" />
          Sample Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-800 border-slate-700 text-slate-300">
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => onSelect(SAMPLE_URLS.electronics)}
        >
          Electronics (4 URLs)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => onSelect(SAMPLE_URLS.grocery)}
        >
          Grocery Items (3 URLs)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => onSelect(SAMPLE_URLS.fashion)}
        >
          Fashion (3 URLs)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => onSelect(SAMPLE_URLS.alcoholic)}
        >
          Alcoholic (2 URLs)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
