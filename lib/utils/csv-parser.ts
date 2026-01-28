import Papa from "papaparse"

export interface CSVParseOptions {
  header?: boolean
  skipEmptyLines?: boolean
  transformHeader?: (header: string) => string
  complete?: (results: any) => void
  error?: (error: any) => void
}

export async function parseCSVFile(file: File, options: CSVParseOptions = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: options.header !== false,
      skipEmptyLines: options.skipEmptyLines !== false,
      transformHeader: options.transformHeader,
      complete: (results) => {
        if (options.complete) {
          options.complete(results)
        }
        resolve(results)
      },
      error: (error) => {
        if (options.error) {
          options.error(error)
        }
        reject(error)
      },
    })
  })
}

export function parseCSVString(csvString: string, options: CSVParseOptions = {}): any {
  return Papa.parse(csvString, {
    header: options.header !== false,
    skipEmptyLines: options.skipEmptyLines !== false,
    transformHeader: options.transformHeader,
  })
}

// Helper function to parse dates from various formats
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null

  // Try to parse the date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0]
  }

  // Try DD/MM/YYYY format
  const parts = dateStr.split(/[/\-.]/)
  if (parts.length === 3) {
    // Assume DD/MM/YYYY format
    const day = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // Months are 0-indexed in JS
    const year = Number.parseInt(parts[2], 10)
    const parsedDate = new Date(year, month, day)
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split("T")[0]
    }
  }

  return null
}

// Helper function to parse amounts
export function parseAmount(amountStr: string): number {
  if (!amountStr) return 0

  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanedStr = amountStr.replace(/[^\d.-]/g, "")
  return Number.parseFloat(cleanedStr) || 0
}
