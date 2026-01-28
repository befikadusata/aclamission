"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddPledgeForm } from "@/components/add-pledge-form"

interface AddPledgeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddPledgeModal({ open, onOpenChange, onSuccess }: AddPledgeModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Pledge</DialogTitle>
          <DialogDescription>
            Create a new pledge commitment for missionary support. Fill in all required fields marked with an asterisk
            (*).
          </DialogDescription>
        </DialogHeader>
        <AddPledgeForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
