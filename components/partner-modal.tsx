"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PartnerForm } from "@/components/partner-form"
import type { Database } from "@/lib/supabase"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

interface PartnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partner?: Partner
  onSuccess?: () => void
}

export function PartnerModal({ open, onOpenChange, partner, onSuccess }: PartnerModalProps) {
  const isEditing = !!partner

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
          <DialogTitle>{isEditing ? "Edit Partner" : "Add New Partner"}</DialogTitle>
          <DialogDescription>
            {isEditing ? `Update information for ${partner.name}` : "Add a new partner organization to the system"}
          </DialogDescription>
        </DialogHeader>
        <PartnerForm partner={partner} onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  )
}
