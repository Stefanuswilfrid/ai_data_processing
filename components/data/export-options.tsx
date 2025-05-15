"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileJson, FileText } from "lucide-react"
import type { ProductData } from "@/lib/types"
import { exportToCSV, exportToJSON } from "@/lib/utils/export-utils"

interface ExportOptionsProps {
  downloadUrl: string
  data: ProductData[]
  onExport: (format: string) => void
}

export function ExportOptions({ downloadUrl, data, onExport }: ExportOptionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
          data-tour="export-options"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-slate-800 border-slate-700 text-slate-300">
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => {
            window.open(downloadUrl, "_blank")
            onExport("excel")
          }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => {
            exportToCSV(data)
            onExport("csv")
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="focus:bg-indigo-600 focus:text-white cursor-pointer"
          onClick={() => {
            exportToJSON(data)
            onExport("json")
          }}
        >
          <FileJson className="h-4 w-4 mr-2" />
          JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
