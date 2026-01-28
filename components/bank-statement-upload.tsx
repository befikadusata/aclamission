"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import Papa from "papaparse"
import { CSVColumnMapper } from "./csv-column-mapper"

export function BankStatementUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [showMapper, setShowMapper] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null) // Clear previous results

      // If it's a CSV file, parse it for column mapping
      if (selectedFile.name.toLowerCase().endsWith(".csv")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const text = e.target?.result as string
          const { data, errors } = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
          })

          if (errors.length > 0) {
            toast({
              title: "CSV Parse Error",
              description: `Error parsing CSV: ${errors[0].message}`,
              variant: "destructive",
            })
            return
          }

          const headers = Object.keys(data[0] || {})
          setCsvHeaders(headers)
          setCsvData(data as any[])
        }
        reader.readAsText(selectedFile)
      }
    }
  }

  const handleDirectUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      setUploadResult(result)

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: result.message || `Successfully imported ${result.rowsImported} transactions.`,
        })

        // Trigger refresh event and page refresh
        window.dispatchEvent(new Event("refresh-transactions"))

        // Refresh the page after a short delay to show the new data
        setTimeout(() => {
          window.location.reload()
        }, 1000)

        // Reset form
        setFile(null)
        setCsvData([])
        setCsvHeaders([])
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload file",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleMappedUpload = async (mapping: Record<string, string>, mappedData: any[]) => {
    setUploading(true)
    try {
      // Process the mapped data to match our database schema
      const processedData = mappedData.map((row) => ({
        value_date: parseDate(row.value_date),
        transaction_type: row.transaction_type || "",
        transaction_reference: row.transaction_reference || "",
        posting_date: parseDate(row.posting_date),
        debit_amount: parseAmount(row.debit_amount),
        credit_amount: parseAmount(row.credit_amount),
        balance: parseAmount(row.balance),
        description: row.description || "",
        benificiary_ac: row.benificiary_ac || "",
        benificiary_name: row.benificiary_name || "",
        transaction_date: parseDate(row.transaction_date),
        branch_code: row.branch_code || "",
        account_number: row.account_number || "",
        reconciled: false,
        notes: "",
        receipt_number: null,
        pledge_id: null,
        outgoing_id: null,
      }))

      // Send to API
      const response = await fetch("/api/bank-statements/upload-mapped", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transactions: processedData }),
      })

      const result = await response.json()
      setUploadResult(result)

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: `Successfully imported ${result.rowsImported} transactions.`,
        })

        // Trigger refresh event and page refresh
        window.dispatchEvent(new Event("refresh-transactions"))

        // Refresh the page after a short delay to show the new data
        setTimeout(() => {
          window.location.reload()
        }, 1000)

        // Reset form
        setFile(null)
        setCsvData([])
        setCsvHeaders([])
        setShowMapper(false)
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload data",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Helper functions
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return !isNaN(date.getTime()) ? date.toISOString().split("T")[0] : null
  }

  const parseAmount = (amountStr: string | number): number => {
    if (typeof amountStr === "number") return amountStr
    if (!amountStr) return 0
    const cleanedStr = amountStr.toString().replace(/[^\d.-]/g, "")
    return Number.parseFloat(cleanedStr) || 0
  }

  if (showMapper) {
    return (
      <CSVColumnMapper
        csvHeaders={csvHeaders}
        csvData={csvData}
        onMappingComplete={handleMappedUpload}
        onCancel={() => setShowMapper(false)}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Bank Statement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Select CSV or Excel File</Label>
          <Input id="file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} disabled={uploading} />
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
            <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}

        {csvHeaders.length > 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">CSV Detected</span>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              Found {csvData.length} rows with columns: {csvHeaders.join(", ")}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDirectUpload} disabled={uploading}>
                Auto Import
              </Button>
              <Button size="sm" onClick={() => setShowMapper(true)} disabled={uploading}>
                Map Columns
              </Button>
            </div>
          </div>
        )}

        {file && !file.name.toLowerCase().endsWith(".csv") && (
          <Button onClick={handleDirectUpload} disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        )}

        {/* Upload Result Display */}
        {uploadResult && (
          <div
            className={`p-3 rounded-lg border ${uploadResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${uploadResult.success ? "text-green-800" : "text-red-800"}`}>
                {uploadResult.success ? "Upload Successful" : "Upload Failed"}
              </span>
            </div>
            <div className={`text-xs ${uploadResult.success ? "text-green-700" : "text-red-700"}`}>
              <p>{uploadResult.message}</p>
              {uploadResult.success && (
                <>
                  <p>• Imported: {uploadResult.rowsImported} transactions</p>
                  {uploadResult.duplicatesSkipped > 0 && <p>• Skipped: {uploadResult.duplicatesSkipped} duplicates</p>}
                  {uploadResult.duplicateReferences && uploadResult.duplicateReferences.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">View duplicate references</summary>
                      <ul className="mt-1 ml-4">
                        {uploadResult.duplicateReferences.map((ref: string, index: number) => (
                          <li key={index}>• {ref}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
