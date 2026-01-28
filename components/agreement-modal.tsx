"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AgreementForm } from "@/components/agreement-form"
import type { Database } from "@/lib/supabase"

type Agreement = Database["public"]["Tables"]["agreements"]["Row"]

interface AgreementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
  agreement?: Agreement
  onSuccess?: () => void
}

export function AgreementModal({ open, onOpenChange, partnerId, agreement, onSuccess }: AgreementModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agreement ? "Edit Agreement" : "Add New Agreement"}</DialogTitle>
        </DialogHeader>
        <AgreementForm
          partnerId={partnerId}
          agreement={agreement}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
