"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddPledgeFormV41 } from "./add-pledge-form-v41"
import type { Database } from "@/lib/supabase"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]

interface AddPledgeModalV41Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIndividual?: Individual | null
  onSuccess?: () => void
}

export function AddPledgeModalV41({ open, onOpenChange, selectedIndividual, onSuccess }: AddPledgeModalV41Props) {
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
          <DialogTitle>
            {selectedIndividual ? `Add Pledge for ${selectedIndividual.name}` : "Add New Individual & Pledge"}
          </DialogTitle>
        </DialogHeader>
        <AddPledgeFormV41 selectedIndividual={selectedIndividual} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
