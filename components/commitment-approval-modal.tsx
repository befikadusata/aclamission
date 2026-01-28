"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, FileText, ExternalLink, CheckCircle, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { format } from "date-fns"

interface CommitmentApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  commitment: any
  onSuccess: () => void
}

export function CommitmentApprovalModal({ isOpen, onClose, commitment, onSuccess }: CommitmentApprovalModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState("")
  const { toast } = useToast()

  if (!commitment) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleApprove = async () => {
    await updateCommitmentStatus("approved")
  }

  const handleReject = async () => {
    await updateCommitmentStatus("rejected")
  }

  const updateCommitmentStatus = async (status: string) => {
    try {
      setIsLoading(true)

      // Update commitment status
      const { error: commitmentError } = await supabase
        .from("commitments")
        .update({
          status,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", commitment.id)

      if (commitmentError) throw commitmentError

      // Create notification for the user
      const { error: notificationError } = await supabase.from("notifications").insert({
        type: "commitment_status",
        title: `Commitment ${status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your commitment of ${formatCurrency(commitment.amount)} has been ${
          status === "approved" ? "approved" : "rejected"
        }${notes ? ": " + notes : ""}`,
        related_id: commitment.pledge_id,
        is_read: false,
        for_admins: false,
        created_at: new Date().toISOString(),
      })

      if (notificationError) throw notificationError

      toast({
        title: `Commitment ${status === "approved" ? "approved" : "rejected"}`,
        description: `The commitment has been successfully ${status === "approved" ? "approved" : "rejected"}`,
      })

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(`Error ${status === "approved" ? "approving" : "rejecting"} commitment:`, error)
      toast({
        title: "Error",
        description: error.message || `Failed to ${status === "approved" ? "approve" : "reject"} commitment`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Review Commitment</DialogTitle>
          <DialogDescription>Review and approve or reject this commitment</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(commitment.amount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bank</p>
              <p>{commitment.bank}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Transaction Reference</p>
              <p>{commitment.transaction_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Submitted On</p>
              <p>{format(new Date(commitment.created_at), "MMMM d, yyyy")}</p>
            </div>
          </div>

          <div className="mt-2">
            <Button variant="outline" size="sm" asChild className="w-full">
              <a href={commitment.receipt_url} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                View Receipt
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Notes (optional)</p>
            <Textarea
              placeholder="Add notes about this commitment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </>
              )}
            </Button>
            <Button onClick={handleApprove} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" /> Approve
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
