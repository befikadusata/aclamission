"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { Upload, X } from "lucide-react"

interface FinalizationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outgoing: {
    id: string
    title: string
    amount: number
  }
  onSuccess: () => void
}

export function FinalizationModal({ open, onOpenChange, outgoing, onSuccess }: FinalizationModalProps) {
  const [loading, setLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    bank_name: "",
    transfer_date: new Date().toISOString().split("T")[0],
    transfer_amount: outgoing.amount.toString(),
  })
  const { toast } = useToast()

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
      const filePath = `transfer-documents/${fileName}`

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
      let transfer_doc_url = null

      if (uploadedFile) {
        transfer_doc_url = await uploadFile(uploadedFile)
        if (!transfer_doc_url) {
          throw new Error("Failed to upload transfer document")
        }
      }

      // Update outgoing status
      const { error: updateError } = await supabase
        .from("outgoings")
        .update({ status: "finalized" })
        .eq("id", outgoing.id)

      if (updateError) throw updateError

      // Create finalization record
      const { error: finalizationError } = await supabase.from("finalizations").insert([
        {
          outgoing_id: outgoing.id,
          bank_name: formData.bank_name,
          transfer_date: formData.transfer_date,
          transfer_amount: Number.parseFloat(formData.transfer_amount),
          transfer_doc_url,
        },
      ])

      if (finalizationError) throw finalizationError

      toast({
        title: "Success",
        description: "Payment finalized successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("Error finalizing payment:", error)
      toast({
        title: "Error",
        description: "Failed to finalize payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalize Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium">{outgoing.title}</h4>
            <p className="text-sm text-muted-foreground">Amount: ${outgoing.amount.toLocaleString()}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bank_name">Bank Name *</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Enter bank name"
                required
              />
            </div>

            <div>
              <Label htmlFor="transfer_date">Transfer Date *</Label>
              <Input
                id="transfer_date"
                type="date"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="transfer_amount">Transfer Amount *</Label>
              <Input
                id="transfer_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.transfer_amount}
                onChange={(e) => setFormData({ ...formData, transfer_amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="document">Transfer Document</Label>
              <div className="mt-2">
                {uploadedFile ? (
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <span className="text-sm">{uploadedFile.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                    <Upload className="mx-auto h-6 w-6 text-gray-400" />
                    <div className="mt-2">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-500">Upload transfer receipt</span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Finalizing..." : "Finalize Payment"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
