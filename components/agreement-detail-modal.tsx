"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  FileText,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { DocumentUploadModal } from "./document-upload-modal"

type Agreement = Database["public"]["Tables"]["agreements"]["Row"]
type Outgoing = Database["public"]["Tables"]["outgoings"]["Row"]
type Document = Database["public"]["Tables"]["documents"]["Row"]

interface AgreementDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agreement: Agreement | null
}

export function AgreementDetailModal({ open, onOpenChange, agreement }: AgreementDetailModalProps) {
  const [outgoings, setOutgoings] = useState<Outgoing[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadDocumentType, setUploadDocumentType] = useState<"signed_agreement" | "receipt" | "report">(
    "signed_agreement",
  )

  useEffect(() => {
    if (agreement && open) {
      fetchAgreementData()
    }
  }, [agreement, open])

  const fetchAgreementData = async () => {
    if (!agreement) return

    try {
      setLoading(true)

      // Fetch outgoings linked to this agreement
      const { data: outgoingsData, error: outgoingsError } = await supabase
        .from("outgoings")
        .select("*")
        .eq("agreement_id", agreement.id)
        .order("created_at", { ascending: false }) // Changed from transaction_date to created_at

      if (outgoingsError) throw outgoingsError

      // Fetch documents linked to this agreement
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("agreement_id", agreement.id)
        .order("uploaded_at", { ascending: false })

      if (documentsError) throw documentsError

      setOutgoings(outgoingsData || [])
      setDocuments(documentsData || [])
    } catch (error) {
      console.error("Error fetching agreement data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch agreement data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const calculateProgress = () => {
    if (!agreement || !outgoings.length) return { disbursed: 0, percentage: 0 }

    const totalDisbursed = outgoings.reduce((sum, o) => sum + (o.amount || 0), 0)
    const totalAmount = agreement.total_amount || 0
    const percentage = totalAmount > 0 ? (totalDisbursed / totalAmount) * 100 : 0

    return { disbursed: totalDisbursed, percentage }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", documentId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Document deleted successfully",
      })

      fetchAgreementData() // Refresh the data
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const handleUploadDocument = (type: "signed_agreement" | "receipt" | "report") => {
    setUploadDocumentType(type)
    setIsUploadModalOpen(true)
  }

  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false)
    fetchAgreementData()
  }

  if (!agreement) return null

  const progress = calculateProgress()
  const receipts = documents.filter((d) => d.document_type === "receipt")
  const reports = documents.filter((d) => d.document_type === "report")
  const signedAgreements = documents.filter((d) => d.document_type === "signed_agreement")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Agreement Details - {agreement.agreement_code}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="receipts">Receipts</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Agreement Code:</span>
                    <span className="font-medium">{agreement.agreement_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <Badge variant="outline">{agreement.type === "annual" ? "Annual" : "One-Time Special"}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Support Type:</span>
                    <Badge variant={agreement.support_type === "missionary_support" ? "default" : "secondary"}>
                      {agreement.support_type === "missionary_support" ? "Missionary" : "Special"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge variant={agreement.status === "active" ? "default" : "secondary"}>{agreement.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Frequency:</span>
                    <Badge variant="outline">{agreement.frequency}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount:</span>
                    <span className="font-medium">{formatCurrency(agreement.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Disbursed:</span>
                    <span className="font-medium text-green-600">{formatCurrency(progress.disbursed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Remaining:</span>
                    <span className="font-medium">
                      {formatCurrency((agreement.total_amount || 0) - progress.disbursed)}
                    </span>
                  </div>
                  {agreement.support_type === "missionary_support" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Missionaries:</span>
                        <span className="font-medium">{agreement.number_of_missionaries || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Per Missionary:</span>
                        <span className="font-medium">{formatCurrency(agreement.amount_per_missionary || 0)}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Start Date:</span>
                    <span className="font-medium">
                      {agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : "Ongoing"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {agreement.created_at ? new Date(agreement.created_at).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Delivery Type:</span>
                  <span className="font-medium">
                    {agreement.delivery_type === "direct_to_missionary" ? "Direct to Missionary" : "Through Partner"}
                  </span>
                </div>
                {agreement.delivery_type === "through_partner" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Bank Name:</span>
                      <span className="font-medium">{agreement.bank_name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Account Number:</span>
                      <span className="font-medium">{agreement.bank_account_number || "N/A"}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {agreement.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{agreement.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Signed Agreement Documents</CardTitle>
                  <p className="text-sm text-muted-foreground">Upload and manage signed agreement documents</p>
                </div>
                <Button variant="outline" onClick={() => handleUploadDocument("signed_agreement")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signed Agreement
                </Button>
              </CardHeader>
              <CardContent>
                {signedAgreements.length > 0 ? (
                  <div className="space-y-3">
                    {signedAgreements.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{doc.file_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, "_blank")}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a")
                              link.href = doc.file_url
                              link.download = doc.file_name
                              link.click()
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No signed agreement documents uploaded yet</p>
                    <p className="text-sm">Upload the signed agreement document to track compliance</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Receipts</CardTitle>
                  <p className="text-sm text-muted-foreground">Payment receipts and transaction confirmations</p>
                </div>
                <Button variant="outline" onClick={() => handleUploadDocument("receipt")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                </Button>
              </CardHeader>
              <CardContent>
                {receipts.length > 0 ? (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div key={receipt.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{receipt.file_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Uploaded {new Date(receipt.uploaded_at).toLocaleDateString()}
                            </div>
                            {receipt.notes && <div className="text-sm text-muted-foreground">{receipt.notes}</div>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(receipt.file_url, "_blank")}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a")
                              link.href = receipt.file_url
                              link.download = receipt.file_name
                              link.click()
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(receipt.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No receipts uploaded yet</p>
                    <p className="text-sm">Upload payment receipts to track disbursements</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Reports</CardTitle>
                  <p className="text-sm text-muted-foreground">Progress reports and updates from the partner</p>
                </div>
                <Button variant="outline" onClick={() => handleUploadDocument("report")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Report
                </Button>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{report.file_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Uploaded {new Date(report.uploaded_at).toLocaleDateString()}
                            </div>
                            {report.notes && <div className="text-sm text-muted-foreground">{report.notes}</div>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => window.open(report.file_url, "_blank")}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a")
                              link.href = report.file_url
                              link.download = report.file_name
                              link.click()
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDocument(report.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No reports uploaded yet</p>
                    <p className="text-sm">Partner reports will appear here when uploaded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Progress</CardTitle>
                <p className="text-sm text-muted-foreground">Track disbursements and linked outgoings</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress.percentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={progress.percentage} className="w-full" />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(progress.disbursed)}</div>
                    <div className="text-sm text-muted-foreground">Total Disbursed</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {formatCurrency((agreement.total_amount || 0) - progress.disbursed)}
                    </div>
                    <div className="text-sm text-muted-foreground">Remaining</div>
                  </div>
                </div>

                {/* Linked Outgoings */}
                <div className="space-y-3">
                  <h4 className="font-medium">Linked Bank Transactions (Outgoings)</h4>
                  {loading ? (
                    <div className="text-center py-4">Loading transactions...</div>
                  ) : outgoings.length > 0 ? (
                    <div className="space-y-2">
                      {outgoings.map((outgoing) => (
                        <div key={outgoing.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <div>
                              <div className="font-medium">{formatCurrency(outgoing.amount || 0)}</div>
                              <div className="text-sm text-muted-foreground">
                                {outgoing.request_date
                                  ? new Date(outgoing.request_date).toLocaleDateString()
                                  : outgoing.created_at
                                    ? new Date(outgoing.created_at).toLocaleDateString()
                                    : "Date not set"}
                              </div>
                              {outgoing.description && (
                                <div className="text-sm text-muted-foreground">{outgoing.description}</div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline">{outgoing.status || "completed"}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                      <p>No linked transactions found</p>
                      <p className="text-sm">Outgoings will appear here when linked to this agreement</p>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2 p-4 bg-muted/50 rounded-lg">
                  {progress.percentage >= 100 ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-green-700">Agreement Fully Funded</span>
                    </>
                  ) : progress.percentage > 0 ? (
                    <>
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-blue-700">In Progress</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span className="font-medium text-orange-700">Awaiting First Disbursement</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <DocumentUploadModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          agreementId={agreement?.id}
          documentType={uploadDocumentType}
          onSuccess={handleUploadSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
