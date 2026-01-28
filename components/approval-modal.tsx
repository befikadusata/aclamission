"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"

interface ApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outgoing: {
    id: string
    title: string
    amount: number
  }
  onSuccess: () => void
}

export function ApprovalModal({ open, onOpenChange, outgoing, onSuccess }: ApprovalModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    approved_by: "",
    approval_date: new Date().toISOString().split("T")[0],
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Update outgoing status
      const { error: updateError } = await supabase
        .from("outgoings")
        .update({ status: "approved" })
        .eq("id", outgoing.id)

      if (updateError) throw updateError

      // Create approval record
      const { error: approvalError } = await supabase.from("approvals").insert([
        {
          outgoing_id: outgoing.id,
          approved_by: formData.approved_by,
          approval_date: formData.approval_date,
        },
      ])

      if (approvalError) throw approvalError

      toast({
        title: "Success",
        description: "Payment approved successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("Error approving payment:", error)
      toast({
        title: "Error",
        description: "Failed to approve payment",
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
          <DialogTitle>Approve Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium">{outgoing.title}</h4>
            <p className="text-sm text-muted-foreground">Amount: ${outgoing.amount.toLocaleString()}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="approved_by">Approved By *</Label>
              <Input
                id="approved_by"
                value={formData.approved_by}
                onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                placeholder="Enter approver name"
                required
              />
            </div>

            <div>
              <Label htmlFor="approval_date">Approval Date *</Label>
              <Input
                id="approval_date"
                type="date"
                value={formData.approval_date}
                onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Approving..." : "Approve Payment"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
