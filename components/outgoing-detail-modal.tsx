"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase-client"
import { FileText, Download, Calendar, User, Building, DollarSign } from "lucide-react"

interface OutgoingDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  outgoing: {
    id: string
    type: "missionary_support" | "other"
    title: string
    description: string | null
    amount: number
    status: "requested" | "approved" | "finalized"
    request_date: string
    agreement_id: string | null
    expense_category: string | null
    supporting_doc_url: string | null
    created_at: string
    agreement?: {
      agreement_code: string
      partner: {
        name: string
      }
    } | null
  }
}

interface ApprovalData {
  approved_by: string
  approval_date: string
}

interface FinalizationData {
  bank_name: string
  transfer_date: string
  transfer_amount: number
  transfer_doc_url: string | null
}

export function OutgoingDetailModal({ open, onOpenChange, outgoing }: OutgoingDetailModalProps) {
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null)
  const [finalizationData, setFinalizationData] = useState<FinalizationData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && outgoing) {
      fetchAdditionalData()
    }
  }, [open, outgoing])

  const fetchAdditionalData = async () => {
    setLoading(true)
    try {
      // Fetch approval data if approved or finalized
      if (outgoing.status === "approved" || outgoing.status === "finalized") {
        const { data: approval } = await supabase
          .from("approvals")
          .select("approved_by, approval_date")
          .eq("outgoing_id", outgoing.id)
          .single()

        if (approval) setApprovalData(approval)
      }

      // Fetch finalization data if finalized
      if (outgoing.status === "finalized") {
        const { data: finalization } = await supabase
          .from("finalizations")
          .select("bank_name, transfer_date, transfer_amount, transfer_doc_url")
          .eq("outgoing_id", outgoing.id)
          .single()

        if (finalization) setFinalizationData(finalization)
      }
    } catch (error) {
      console.error("Error fetching additional data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge variant="secondary">Requested</Badge>
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "finalized":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Finalized
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "missionary_support":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            Missionary Support
          </Badge>
        )
      case "other":
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-700">
            Other
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Details</span>
            {getStatusBadge(outgoing.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{outgoing.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                {getTypeBadge(outgoing.type)}
                <span className="text-2xl font-bold text-green-600">{formatCurrency(outgoing.amount)}</span>
              </div>
            </div>

            {outgoing.description && (
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm">{outgoing.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Requested: {formatDate(outgoing.request_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Amount: {formatCurrency(outgoing.amount)}</span>
              </div>
            </div>

            {/* Agreement or Category Info */}
            {outgoing.type === "missionary_support" && outgoing.agreement ? (
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Agreement Details</span>
                </div>
                <p className="text-sm text-blue-800">
                  {outgoing.agreement.agreement_code} - {outgoing.agreement.partner.name}
                </p>
              </div>
            ) : outgoing.expense_category ? (
              <div className="p-3 bg-purple-50 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <Building className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Expense Category</span>
                </div>
                <p className="text-sm text-purple-800">{outgoing.expense_category}</p>
              </div>
            ) : null}

            {/* Supporting Document */}
            {outgoing.supporting_doc_url && (
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Supporting Document</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(outgoing.supporting_doc_url!, "_blank")}>
                  <Download className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            )}
          </div>

          {/* Approval Information */}
          {approvalData && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-green-700">Approval Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Approved by: {approvalData.approved_by}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Date: {formatDate(approvalData.approval_date)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Finalization Information */}
          {finalizationData && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-700">Transfer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>Bank: {finalizationData.bank_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Transfer Date: {formatDate(finalizationData.transfer_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Amount: {formatCurrency(finalizationData.transfer_amount)}</span>
                  </div>
                </div>

                {finalizationData.transfer_doc_url && (
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Transfer Receipt</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(finalizationData.transfer_doc_url!, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
