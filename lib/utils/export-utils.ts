import type { ProductData } from "@/lib/types"

export function exportToCSV(data: ProductData[]) {
  if (!data.length) return

  const allKeys = Array.from(new Set(data.flatMap((item) => Object.keys(item))))

  let csv = allKeys.join(",") + "\n"

  data.forEach((item) => {
    const row = allKeys
      .map((key) => {
        const value = item[key]
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value !== null && value !== undefined ? value : ""
      })
      .join(",")
    csv += row + "\n"
  })

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "product_data.csv")
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToJSON(data: ProductData[]) {
  if (!data.length) return

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", "product_data.json")
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
