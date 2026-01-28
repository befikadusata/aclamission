"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AddIndividualPledgeForm } from "@/components/add-individual-pledge-form"
import type { Database } from "@/lib/supabase"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]

interface AddIndividualPledgeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIndividual?: Individual | null
  onSuccess?: () => void
}

export function AddIndividualPledgeModal({
  open,
  onOpenChange,
  selectedIndividual,
  onSuccess,
}: AddIndividualPledgeModalProps) {
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
          <DialogTitle>
            {selectedIndividual ? `Add Pledge for ${selectedIndividual.name}` : "Add Individual & Pledge"}
          </DialogTitle>
          <DialogDescription>
            {selectedIndividual
              ? "Create a new pledge for this individual."
              : "Select an existing individual or create a new one, then add their pledge."}
          </DialogDescription>
        </DialogHeader>
        <AddIndividualPledgeForm
          selectedIndividual={selectedIndividual}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
