"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditPledgeForm } from "@/components/edit-pledge-form"
import type { Database } from "@/lib/supabase"

type Pledge = Database["public"]["Tables"]["pledges"]["Row"]

interface EditPledgeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pledge: Pledge | null
  onSuccess?: () => void
}

export function EditPledgeModal({ open, onOpenChange, pledge, onSuccess }: EditPledgeModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!pledge) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pledge</DialogTitle>
          <DialogDescription>Update the pledge information for {pledge.full_name}.</DialogDescription>
        </DialogHeader>
        <EditPledgeForm pledge={pledge} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
