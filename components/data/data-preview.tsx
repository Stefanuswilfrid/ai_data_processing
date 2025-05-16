"use client"

import type React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ProductData } from "@/lib/types"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ExternalLink, Search, Copy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface DataPreviewProps {
  data: ProductData[]
}

export function DataPreview({ data }: DataPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const itemsPerPage = 5
  const { toast } = useToast()

  if (!data.length) return null

  const allKeys = Array.from(new Set(data.flatMap((item) => Object.keys(item))))

  const filteredData = searchTerm
    ? data.filter((item) =>
        Object.values(item).some((value) => value && String(value).toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : data

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  // Get current page data
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const handleCopyCell = (value: any) => {
    if (value !== null && value !== undefined) {
      navigator.clipboard.writeText(String(value))
      toast({
        title: "Copied to clipboard",
        description: "Cell content has been copied to clipboard",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center mb-4">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page on search
            }}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-700">
        <Table className="w-full">
          <TableHeader className="bg-slate-800">
            <TableRow className="hover:bg-slate-800/80 border-slate-700">
              <TableHead className="w-12 text-slate-300 font-medium">#</TableHead>
              {allKeys.map((key) => (
                <TableHead key={key} className="text-slate-300 font-medium">
                  {key}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow key={index} className="hover:bg-slate-800/30 border-slate-700/50">
                <TableCell className="font-medium text-slate-300">{startIndex + index + 1}</TableCell>
                {allKeys.map((key) => (
                  <TableCell key={key} className="text-slate-300 group relative">
                    {renderCellContent(item[key])}
                    {item[key] !== null && item[key] !== undefined && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={() => handleCopyCell(item[key])}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {filteredData.length === 0 ? (
            "No results found"
          ) : (
            <>
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} of{" "}
              {filteredData.length} items
              {searchTerm && ` (filtered from ${data.length} total)`}
            </>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function renderCellContent(value: any): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-slate-500">-</span>
  }

  if (
    typeof value === "string" &&
    value.startsWith("http") &&
    (value.endsWith(".jpg") ||
      value.endsWith(".png") ||
      value.endsWith(".jpeg") ||
      value.endsWith(".webp") ||
      value.endsWith(".gif"))
  ) {
    return (
      <div className="relative group">
        <img
          src={value || "/placeholder.svg"}
          alt="Product"
          className="w-12 h-12 object-contain rounded-md border border-slate-700 bg-slate-800/50"
        />
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
          title="View full image"
        >
          <ExternalLink className="h-4 w-4 text-white" />
        </a>
      </div>
    )
  }

  if (typeof value === "string" && value.startsWith("http")) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-400 hover:text-indigo-300 hover:underline truncate max-w-[200px] inline-block flex items-center"
      >
        <span className="truncate">{value}</span>
        <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
      </a>
    )
  }

  return String(value)
}
