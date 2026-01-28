"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { FileText, CheckCircle, XCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { MissionaryColumnMapper } from "./missionary-column-mapper"
import { supabase } from "@/lib/supabase-client"

interface MissionaryUploadProps {
  partnerId: string
  onSuccess?: () => void
}

export function MissionaryUpload({ partnerId, onSuccess }: MissionaryUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [excelData, setExcelData] = useState<any[]>([])
  const [excelHeaders, setExcelHeaders] = useState<string[]>([])
  const [showMapper, setShowMapper] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null) // Clear previous results

      // Parse Excel or CSV file
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          if (!data) return

          let parsedData: any[] = []
          let headers: string[] = []

          // Parse Excel
          if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
            const workbook = XLSX.read(data, { type: "binary" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            parsedData = XLSX.utils.sheet_to_json(worksheet)

            if (parsedData.length > 0) {
              headers = Object.keys(parsedData[0])
            }
          }
          // Parse CSV
          else if (selectedFile.name.endsWith(".csv")) {
            const csvText = data.toString()
            const workbook = XLSX.read(csvText, { type: "string" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            parsedData = XLSX.utils.sheet_to_json(worksheet)

            if (parsedData.length > 0) {
              headers = Object.keys(parsedData[0])
            }
          }

          setExcelHeaders(headers)
          setExcelData(parsedData)

          if (parsedData.length > 0) {
            setShowMapper(true)
          } else {
            toast({
              title: "Error",
              description: "No data found in the file",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("File parsing error:", error)
          toast({
            title: "Error",
            description: "Failed to parse the file. Please check the file format.",
            variant: "destructive",
          })
        }
      }

      if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        reader.readAsBinaryString(selectedFile)
      } else if (selectedFile.name.endsWith(".csv")) {
        reader.readAsText(selectedFile)
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload an Excel (.xlsx, .xls) or CSV (.csv) file",
          variant: "destructive",
        })
      }
    }
  }

  const handleMappedUpload = async (mapping: Record<string, string>, mappedData: any[]) => {
    setUploading(true)
    try {
      // Get the current session token
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to upload data",
          variant: "destructive",
        })
        return
      }

      // Send to API with authorization header
      const response = await fetch("/api/missionaries/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          missionaries: mappedData,
          partnerId,
        }),
      })

      const result = await response.json()
      setUploadResult(result)

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: `Successfully imported ${result.rowsImported} missionaries.`,
        })

        // Reset form
        setFile(null)
        setExcelData([])
        setExcelHeaders([])
        setShowMapper(false)

        // Call success callback
        onSuccess?.()
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload data",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "An unexpected error occurred during upload",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  if (showMapper) {
    return (
      <MissionaryColumnMapper
        excelHeaders={excelHeaders}
        excelData={excelData}
        onMappingComplete={handleMappedUpload}
        onCancel={() => setShowMapper(false)}
      />
    )
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="file">Select Excel or CSV File</Label>
          <Input id="file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} disabled={uploading} />
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
            <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        )}

        {/* Upload Result Display */}
        {uploadResult && (
          <div
            className={`p-3 rounded-lg border ${
              uploadResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}
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
                  <p>• Imported: {uploadResult.rowsImported} missionaries</p>
                  {uploadResult.duplicatesSkipped > 0 && <p>• Skipped: {uploadResult.duplicatesSkipped} duplicates</p>}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
