"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { Upload, X } from "lucide-react"

interface AddOutgoingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Agreement {
  id: string
  agreement_code: string
  partner: {
    name: string
  }
}

export function AddOutgoingModal({ open, onOpenChange, onSuccess }: AddOutgoingModalProps) {
  const [loading, setLoading] = useState(false)
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    type: "",
    title: "",
    description: "",
    amount: "",
    agreement_id: "",
    expense_category: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchAgreements()
    }
  }, [open])

  const fetchAgreements = async () => {
    try {
      const { data, error } = await supabase
        .from("agreements")
        .select(`
          id,
          agreement_code,
          partner:partners(name)
        `)
        .eq("status", "active")

      if (error) throw error
      setAgreements(data || [])
    } catch (error) {
      console.error("Error fetching agreements:", error)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setUploadedFile(file)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `outgoing-documents/${fileName}`

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error("Error uploading file:", error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let supporting_doc_url = null

      if (uploadedFile) {
        supporting_doc_url = await uploadFile(uploadedFile)
        if (!supporting_doc_url) {
          throw new Error("Failed to upload document")
        }
      }

      const outgoingData = {
        type: formData.type as "missionary_support" | "other",
        title: formData.title,
        description: formData.description || null,
        amount: Number.parseFloat(formData.amount),
        agreement_id: formData.type === "missionary_support" ? formData.agreement_id : null,
        expense_category: formData.type === "other" ? formData.expense_category : null,
        supporting_doc_url,
        status: "requested" as const,
      }

      const { error } = await supabase.from("outgoings").insert([outgoingData])

      if (error) throw error

      toast({
        title: "Success",
        description: "Payment request created successfully",
      })

      // Reset form
      setFormData({
        type: "",
        title: "",
        description: "",
        amount: "",
        agreement_id: "",
        expense_category: "",
      })
      setUploadedFile(null)
      onSuccess()
    } catch (error) {
      console.error("Error creating outgoing:", error)
      toast({
        title: "Error",
        description: "Failed to create payment request",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const expenseCategories = [
    "Event Logistics",
    "Office Supplies",
    "Training & Development",
    "Travel & Transportation",
    "Communications",
    "Equipment & Technology",
    "Marketing & Outreach",
    "Administrative Costs",
    "Other",
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Payment Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Payment Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="missionary_support">Missionary Support</SelectItem>
                  <SelectItem value="other">Other Expenses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the payment"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Detailed Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide more details about this payment..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {formData.type === "missionary_support" && (
              <div>
                <Label htmlFor="agreement">Agreement *</Label>
                <Select
                  value={formData.agreement_id}
                  onValueChange={(value) => setFormData({ ...formData, agreement_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agreement" />
                  </SelectTrigger>
                  <SelectContent>
                    {agreements.map((agreement) => (
                      <SelectItem key={agreement.id} value={agreement.id}>
                        {agreement.agreement_code} - {agreement.partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === "other" && (
              <div>
                <Label htmlFor="expense_category">Expense Category *</Label>
                <Select
                  value={formData.expense_category}
                  onValueChange={(value) => setFormData({ ...formData, expense_category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="document">Supporting Document (Optional)</Label>
              <div className="mt-2">
                {uploadedFile ? (
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <span className="text-sm">{uploadedFile.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-500">Upload a file</span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Payment Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
