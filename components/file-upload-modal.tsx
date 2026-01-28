"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, X, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"

type Partner = Database["public"]["Tables"]["partners"]["Row"]
type Agreement = Database["public"]["Tables"]["agreements"]["Row"] & {
  expected_uploads?: number
  current_uploads?: number
}

interface FileUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner: Partner | null
  uploadType: "receipt" | "report"
  onSuccess?: () => void
}

export function FileUploadModal({ open, onOpenChange, partner, uploadType, onSuccess }: FileUploadModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [selectedAgreementId, setSelectedAgreementId] = useState("")
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open && partner) {
      fetchAgreements()
    }
  }, [open, partner])

  async function fetchAgreements() {
    if (!partner) return

    try {
      const { data: agreementData, error } = await supabase
        .from("agreements")
        .select("*")
        .eq("partner_id", partner.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Agreements fetch error:", error)
        return
      }

      // Calculate expected uploads and current uploads for each agreement
      const agreementsWithCounts = await Promise.all(
        (agreementData || []).map(async (agreement) => {
          // Calculate expected uploads based on frequency
          let expectedUploads = 1
          if (agreement.frequency === "monthly") {
            expectedUploads = 12
          } else if (agreement.frequency === "quarterly") {
            expectedUploads = 4
          }

          // Count current uploads
          const { count: currentUploads } = await supabase
            .from("disbursements")
            .select("*", { count: "exact", head: true })
            .eq("agreement_id", agreement.id)
            .not(uploadType === "receipt" ? "receipt_url" : "report_url", "is", null)

          return {
            ...agreement,
            expected_uploads: expectedUploads,
            current_uploads: currentUploads || 0,
          }
        }),
      )

      setAgreements(agreementsWithCounts)
    } catch (error) {
      console.error("Error fetching agreements:", error)
    }
  }

  const getUploadStatus = (agreement: Agreement) => {
    if (!agreement.expected_uploads || !agreement.current_uploads) return "info"
    if (agreement.current_uploads >= agreement.expected_uploads) return "complete"
    return "pending"
  }

  const getUploadStatusText = (agreement: Agreement) => {
    if (!agreement.expected_uploads || agreement.current_uploads === undefined) return ""
    return `${agreement.current_uploads}/${agreement.expected_uploads} ${uploadType}s uploaded`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]

      // Validate file size
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ]

      if (!allowedTypes.includes(file.type)) {
        setError("Invalid file type. Please select PDF, DOC, DOCX, JPG, or PNG files only.")
        return
      }

      setError(null)
      setSelectedFile(file)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setError(null)
    const fileInput = document.getElementById("file-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !partner || !selectedAgreementId) {
      setError("Please select a file and agreement.")
      return
    }

    if (uploadType === "receipt" && !amount) {
      setError("Amount is required for receipts.")
      return
    }

    // Check if this agreement already has the maximum uploads
    const selectedAgreement = agreements.find((a) => a.id === selectedAgreementId)
    if (
      selectedAgreement &&
      selectedAgreement.current_uploads !== undefined &&
      selectedAgreement.expected_uploads &&
      selectedAgreement.current_uploads >= selectedAgreement.expected_uploads
    ) {
      setError(
        `This agreement already has the maximum number of ${uploadType}s (${selectedAgreement.expected_uploads}).`,
      )
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("partnerId", partner.id)
      formData.append("agreementId", selectedAgreementId)
      formData.append("uploadType", uploadType)
      formData.append("description", description)
      formData.append("amount", amount)
      formData.append("date", date)

      // Upload file to server
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || result.details || "Upload failed")
      }

      toast({
        title: "Success",
        description: result.message || `${uploadType === "receipt" ? "Receipt" : "Report"} uploaded successfully.`,
      })

      // Reset form
      setSelectedFile(null)
      setDescription("")
      setAmount("")
      setDate(new Date().toISOString().split("T")[0])
      setSelectedAgreementId("")
      setError(null)

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Upload error:", error)
      const errorMessage = error.message || `Failed to upload ${uploadType}`
      setError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setDescription("")
    setAmount("")
    setDate(new Date().toISOString().split("T")[0])
    setSelectedAgreementId("")
    setError(null)
    onOpenChange(false)
  }

  if (!partner) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Upload {uploadType === "receipt" ? "Receipt" : "Report"} for {partner.name}
          </DialogTitle>
          <DialogDescription>
            Upload a {uploadType === "receipt" ? "receipt" : "report"} document for a specific agreement with this
            partner.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="agreement">
                    Select Agreement <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedAgreementId} onValueChange={setSelectedAgreementId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agreement" />
                    </SelectTrigger>
                    <SelectContent>
                      {agreements.map((agreement) => (
                        <SelectItem key={agreement.id} value={agreement.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {agreement.agreement_code} - {agreement.frequency}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2">{getUploadStatusText(agreement)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAgreementId && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {(() => {
                          const agreement = agreements.find((a) => a.id === selectedAgreementId)
                          if (!agreement) return ""
                          const status = getUploadStatus(agreement)
                          if (status === "complete") {
                            return `This agreement has all required ${uploadType}s uploaded.`
                          }
                          return `This agreement expects ${agreement.expected_uploads} ${uploadType}s total (${agreement.frequency} frequency).`
                        })()}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file-upload">
                    Select File <span className="text-red-500">*</span>
                  </Label>
                  {selectedFile ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">{selectedFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveFile}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-2">Click to select a file or drag and drop</p>
                      <p className="text-xs text-muted-foreground">Supports PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="mt-2"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      Date <span className="text-red-500">*</span>
                    </Label>
                    <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount (USD) {uploadType === "receipt" && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required={uploadType === "receipt"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Enter a description for this ${uploadType}...`}
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedFile || !selectedAgreementId}>
              {isLoading ? "Uploading..." : `Upload ${uploadType === "receipt" ? "Receipt" : "Report"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
