"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/supabase"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

interface ReceiptsReportsUploadProps {
  partner: Partner
  onUploadSuccess?: () => void
}

export function ReceiptsReportsUpload({ partner, onUploadSuccess }: ReceiptsReportsUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [documentType, setDocumentType] = useState("")
  const { toast } = useToast()

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !documentType) {
      toast({
        title: "Error",
        description: "Please select a file and document type",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)

      // Here you would implement the actual upload logic
      // For now, we'll just show a success message

      toast({
        title: "Success",
        description: `${documentType} uploaded successfully`,
      })

      onUploadSuccess?.()
    } catch (error) {
      console.error("Error uploading document:", error)
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="financial_statement">Financial Statement</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              onChange={handleUpload}
              disabled={uploading || !documentType}
            />
          </div>
        </div>

        {uploading && (
          <div className="text-center py-4">
            <div className="text-sm text-muted-foreground">Uploading document...</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
