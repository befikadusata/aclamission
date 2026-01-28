"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MissionaryUpload } from "./missionary-upload"

interface MissionaryUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerId: string
  onSuccess: () => void
}

export function MissionaryUploadModal({ open, onOpenChange, partnerId, onSuccess }: MissionaryUploadModalProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Missionaries</DialogTitle>
          <DialogDescription>
            Upload multiple missionaries from an Excel or CSV file. You can map the columns to match our database
            fields.
          </DialogDescription>
        </DialogHeader>
        <MissionaryUpload partnerId={partnerId} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
