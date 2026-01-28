"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

interface DocumentUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId?: string
  agreementId?: string
  documentType: "signed_agreement" | "receipt" | "report"
  onSuccess?: () => void
}

export function DocumentUploadModal({
  open,
  onOpenChange,
  partnerId,
  agreementId,
  documentType,
  onSuccess,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      })
      return
    }

    if (!partnerId && !agreementId) {
      toast({
        title: "Error",
        description: "Partner ID or Agreement ID is required",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documents/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage.from("documents").upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath)

      // Save document record to database
      const documentData = {
        partner_id: partnerId || null,
        agreement_id: agreementId || null,
        document_type: documentType,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        notes: notes || null,
      }

      const { error: dbError } = await supabase.from("documents").insert([documentData])

      if (dbError) {
        throw dbError
      }

      toast({
        title: "Success",
        description: "Document uploaded successfully",
      })

      // Reset form
      setFile(null)
      setNotes("")
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const getDocumentTypeLabel = () => {
    switch (documentType) {
      case "signed_agreement":
        return "Signed Agreement"
      case "receipt":
        return "Receipt"
      case "report":
        return "Report"
      default:
        return "Document"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload {getDocumentTypeLabel()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">
              Select File <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="flex-1"
              />
              {file && (
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this document..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
