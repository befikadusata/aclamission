"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddMissionaryForm } from "./add-missionary-form"
import type { Database } from "@/lib/supabase"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

interface AddMissionaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
  onSuccess: () => void
}

export function AddMissionaryModal({ open, onOpenChange, partnerId, onSuccess }: AddMissionaryModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess()
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Missionary</DialogTitle>
          <DialogDescription>Add a new missionary to this partner organization.</DialogDescription>
        </DialogHeader>
        <AddMissionaryForm partnerId={partnerId} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
