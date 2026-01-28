"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useAuth } from "@/contexts/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MakeCommitmentModalProps {
  isOpen: boolean
  onClose: () => void
  pledgeId: string
  pledgeAmount: number
  onSuccess?: () => void
}

export function MakeCommitmentModal({ isOpen, onClose, pledgeId, pledgeAmount, onSuccess }: MakeCommitmentModalProps) {
  const [amount, setAmount] = useState(pledgeAmount.toString())
  const [bank, setBank] = useState("")
  const [transactionNumber, setTransactionNumber] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a commitment",
        variant: "destructive",
      })
      return
    }

    if (!receiptFile) {
      toast({
        title: "Missing receipt",
        description: "Please upload a receipt or proof of payment",
        variant: "destructive",
      })
      return
    }

    if (!bank) {
      toast({
        title: "Missing bank",
        description: "Please select a bank",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Upload receipt file
      setIsUploading(true)
      const fileExt = receiptFile.name.split(".").pop()
      const fileName = `${pledgeId}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("commitments")
        .upload(filePath, receiptFile)

      if (uploadError) throw uploadError

      // 2. Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage.from("commitments").getPublicUrl(filePath)
      const receiptUrl = publicUrlData.publicUrl
      setIsUploading(false)

      // 3. Create commitment record
      const { error: commitmentError } = await supabase.from("commitments").insert({
        pledge_id: pledgeId,
        user_id: user.id, // Use user.id instead of profile?.id
        amount: Number.parseFloat(amount),
        bank,
        transaction_number: transactionNumber || null,
        receipt_url: receiptUrl,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (commitmentError) throw commitmentError

      // 4. Create notification for admins
      const { error: notificationError } = await supabase.from("notifications").insert({
        type: "commitment",
        title: "New Commitment Submitted",
        message: `A new commitment of ETB ${amount} has been submitted and is pending approval.`,
        related_id: pledgeId,
        is_read: false,
        for_admins: true,
        created_at: new Date().toISOString(),
      })

      if (notificationError) throw notificationError

      toast({
        title: "Commitment submitted",
        description: "Your commitment has been submitted successfully and is pending approval.",
      })

      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      console.error("Error submitting commitment:", error)
      toast({
        title: "Error submitting commitment",
        description: error.message || "Failed to submit commitment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, "")

    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value)
    setAmount(formatted)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Make a Commitment</DialogTitle>
          <DialogDescription>Submit proof of your pledge commitment payment</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETB)</Label>
            <Input id="amount" value={amount} onChange={handleAmountChange} placeholder="0" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Select value={bank} onValueChange={setBank} required>
              <SelectTrigger>
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia</SelectItem>
                <SelectItem value="Dashen Bank">Dashen Bank</SelectItem>
                <SelectItem value="Awash Bank">Awash Bank</SelectItem>
                <SelectItem value="Abyssinia Bank">Abyssinia Bank</SelectItem>
                <SelectItem value="Wegagen Bank">Wegagen Bank</SelectItem>
                <SelectItem value="United Bank">United Bank</SelectItem>
                <SelectItem value="Nib International Bank">Nib International Bank</SelectItem>
                <SelectItem value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</SelectItem>
                <SelectItem value="Lion International Bank">Lion International Bank</SelectItem>
                <SelectItem value="Zemen Bank">Zemen Bank</SelectItem>
                <SelectItem value="Oromia International Bank">Oromia International Bank</SelectItem>
                <SelectItem value="Bunna International Bank">Bunna International Bank</SelectItem>
                <SelectItem value="Berhan International Bank">Berhan International Bank</SelectItem>
                <SelectItem value="Abay Bank">Abay Bank</SelectItem>
                <SelectItem value="Addis International Bank">Addis International Bank</SelectItem>
                <SelectItem value="Debub Global Bank">Debub Global Bank</SelectItem>
                <SelectItem value="Enat Bank">Enat Bank</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionNumber">Transaction Reference (Optional)</Label>
            <Input
              id="transactionNumber"
              value={transactionNumber}
              onChange={(e) => setTransactionNumber(e.target.value)}
              placeholder="Transaction number or reference"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Upload Receipt</Label>
            <div className="border border-input rounded-md p-2">
              <Input
                id="receipt"
                type="file"
                onChange={handleFileChange}
                accept="image/*,.pdf"
                className="cursor-pointer"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a photo or scan of your payment receipt or bank transfer confirmation
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading..." : "Submitting..."}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Commitment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
