"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PartnersTable } from "@/components/partners-table"
import { PartnerModal } from "@/components/partner-modal"
import { PartnerDetail } from "@/components/partner-detail"
import { AgreementModal } from "@/components/agreement-modal"
import { DocumentUploadModal } from "@/components/document-upload-modal"
import { PartnersSummaryCards } from "@/components/partners-summary-cards"
import type { Database } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

export default function PartnersPage() {
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false)
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false)
  const [documentUploadType, setDocumentUploadType] = useState<"signed_agreement" | "receipt" | "report">("report")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleViewPartner = (partner: Partner) => {
    setSelectedPartner(partner)
    setIsDetailViewOpen(true)
  }

  const handleEditPartner = (partner: Partner) => {
    setSelectedPartner(partner)
    setIsPartnerModalOpen(true)
  }

  const handleAddPartner = () => {
    setSelectedPartner(null)
    setIsPartnerModalOpen(true)
  }

  const handleAddAgreement = (partner: Partner) => {
    setSelectedPartner(partner)
    setIsAgreementModalOpen(true)
  }

  const handleUploadReport = (partner: Partner) => {
    setSelectedPartner(partner)
    setDocumentUploadType("report")
    setIsDocumentUploadOpen(true)
  }

  const handleUploadReceipt = (partner: Partner) => {
    setSelectedPartner(partner)
    setDocumentUploadType("receipt")
    setIsDocumentUploadOpen(true)
  }

  const handlePartnerSuccess = () => {
    setIsPartnerModalOpen(false)
    setSelectedPartner(null)
    handleRefresh()
    toast({
      title: "Success",
      description: "Partner saved successfully",
    })
  }

  const handleAgreementSuccess = () => {
    setIsAgreementModalOpen(false)
    handleRefresh()
    toast({
      title: "Success",
      description: "Agreement saved successfully",
    })
  }

  const handleDocumentUploadSuccess = () => {
    setIsDocumentUploadOpen(false)
    handleRefresh()
    toast({
      title: "Success",
      description: "Document uploaded successfully",
    })
  }

  const handleCloseDetailView = () => {
    setIsDetailViewOpen(false)
    setSelectedPartner(null)
  }

  if (isDetailViewOpen && selectedPartner) {
    return (
      <div className="space-y-6">
        <PartnerDetail
          partnerId={selectedPartner.id}
          onEdit={handleEditPartner}
          onAddAgreement={handleAddAgreement}
          onUploadReport={handleUploadReport}
          onUploadReceipt={handleUploadReceipt}
          onClose={handleCloseDetailView}
        />

        {/* Modals */}
        <PartnerModal
          open={isPartnerModalOpen}
          onOpenChange={setIsPartnerModalOpen}
          partner={selectedPartner}
          onSuccess={handlePartnerSuccess}
        />

        <AgreementModal
          open={isAgreementModalOpen}
          onOpenChange={setIsAgreementModalOpen}
          partnerId={selectedPartner?.id || ""}
          onSuccess={handleAgreementSuccess}
        />

        <DocumentUploadModal
          open={isDocumentUploadOpen}
          onOpenChange={setIsDocumentUploadOpen}
          partnerId={selectedPartner?.id}
          documentType={documentUploadType}
          onSuccess={handleDocumentUploadSuccess}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground">Manage your mission partners and their agreements</p>
        </div>
        <Button onClick={handleAddPartner} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Partner
        </Button>
      </div>

      {/* Summary Cards */}
      <PartnersSummaryCards />

      {/* Partners Table */}
      <PartnersTable
        onViewPartner={handleViewPartner}
        onEditPartner={handleEditPartner}
        onAddAgreement={handleAddAgreement}
        onUploadReport={handleUploadReport}
        onUploadReceipt={handleUploadReceipt}
        refreshTrigger={refreshTrigger}
      />

      {/* Modals */}
      <PartnerModal
        open={isPartnerModalOpen}
        onOpenChange={setIsPartnerModalOpen}
        partner={selectedPartner}
        onSuccess={handlePartnerSuccess}
      />

      <AgreementModal
        open={isAgreementModalOpen}
        onOpenChange={setIsAgreementModalOpen}
        partnerId={selectedPartner?.id || ""}
        onSuccess={handleAgreementSuccess}
      />

      <DocumentUploadModal
        open={isDocumentUploadOpen}
        onOpenChange={setIsDocumentUploadOpen}
        partnerId={selectedPartner?.id}
        documentType={documentUploadType}
        onSuccess={handleDocumentUploadSuccess}
      />
    </div>
  )
}
