"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditMissionaryForm } from "./edit-missionary-form"
import type { Database } from "@/lib/supabase"

type Missionary = Database["public"]["Tables"]["missionaries"]["Row"]

interface EditMissionaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  missionary: Missionary
  onSuccess?: () => void
}

export function EditMissionaryModal({ open, onOpenChange, missionary, onSuccess }: EditMissionaryModalProps) {
  const handleSuccess = () => {
    onSuccess?.()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Missionary: {missionary.name}</DialogTitle>
        </DialogHeader>
        <EditMissionaryForm missionary={missionary} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
