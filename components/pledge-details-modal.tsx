"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Edit, Mail, Phone, FileText, ExternalLink, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { format } from "date-fns"
import type { Database } from "@/lib/supabase"

type Pledge = Database["public"]["Tables"]["pledges"]["Row"]

interface PledgeDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pledge: Pledge | null
  onEdit?: (pledge: Pledge) => void
}

export function PledgeDetailsModal({ open, onOpenChange, pledge, onEdit }: PledgeDetailsModalProps) {
  const [commitments, setCommitments] = useState<any[]>([])
  const [loadingCommitments, setLoadingCommitments] = useState(false)

  useEffect(() => {
    if (open && pledge) {
      fetchCommitments()
    }
  }, [open, pledge])

  const fetchCommitments = async () => {
    if (!pledge) return

    try {
      setLoadingCommitments(true)
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .eq("pledge_id", pledge.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCommitments(data || [])
    } catch (error) {
      console.error("Error fetching commitments:", error)
    } finally {
      setLoadingCommitments(false)
    }
  }

  if (!pledge) return null

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return "N/A"
    return format(new Date(date), "MMM dd, yyyy")
  }

  const getFulfillmentBadgeVariant = (status: number | null) => {
    if (!status) return "outline"
    if (status === 100) return "default"
    if (status >= 50) return "secondary"
    return "destructive"
  }

  const getCommitmentStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pledge Details</DialogTitle>
          <DialogDescription>Complete information for {pledge.full_name}&apos;s pledge</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Personal Information
                <Button size="sm" onClick={() => onEdit?.(pledge)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p className="text-lg font-semibold">{pledge.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Commitment</p>
                  <p>{formatDate(pledge.date_of_commitment)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                  <p>{pledge.phone_number || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                  <p>{pledge.email || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missionary Support */}
          <Card>
            <CardHeader>
              <CardTitle>Missionary Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Missionaries Committed</p>
                  <p className="text-2xl font-bold">{pledge.missionaries_committed}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                  <Badge variant="outline">{pledge.frequency}</Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Support Amount</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(pledge.amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Support */}
          {pledge.special_support_amount && pledge.special_support_amount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Special Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Special Support Amount</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(pledge.special_support_amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                    <Badge variant="outline">{pledge.special_support_frequency}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* In-Kind Support */}
          <Card>
            <CardHeader>
              <CardTitle>In-Kind Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Provides In-Kind Support</p>
                <Badge variant={pledge.in_kind_support ? "default" : "outline"}>
                  {pledge.in_kind_support ? "Yes" : "No"}
                </Badge>
              </div>
              {pledge.in_kind_support && pledge.in_kind_support_details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In-Kind Support Details</p>
                  <p className="mt-1 p-3 bg-muted rounded-md">{pledge.in_kind_support_details}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fulfillment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Fulfillment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fulfillment Rate</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getFulfillmentBadgeVariant(pledge.fulfillment_status)}>
                      {pledge.fulfillment_status || 0}%
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Fulfillment Date</p>
                  <p>{formatDate(pledge.last_fulfillment_date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commitments */}
          <Card>
            <CardHeader>
              <CardTitle>Supporter Commitments</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCommitments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : commitments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No commitments submitted yet</p>
              ) : (
                <div className="space-y-4">
                  {commitments.map((commitment) => (
                    <div key={commitment.id} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{formatCurrency(commitment.amount)}</h3>
                            {getCommitmentStatusBadge(commitment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Bank: {commitment.bank}{" "}
                            {commitment.transaction_number && `• Ref: ${commitment.transaction_number}`}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(commitment.created_at)}</p>
                      </div>

                      {commitment.receipt_url && (
                        <div className="mt-3">
                          <Button variant="outline" size="sm" asChild>
                            <a href={commitment.receipt_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-4 w-4 mr-2" />
                              View Receipt
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline" size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Send SMS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
