"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowRight, Calendar, DollarSign, FileText, CheckCircle, Clock, AlertCircle, Upload, Building2, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { SupporterDashboardLayout } from "@/components/supporter-dashboard-layout"
import { SupporterMetricCard } from "@/components/supporter-metric-card"

export default function SupporterCommitmentsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [commitments, setCommitments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchCommitments()
    }
  }, [user])

  const fetchCommitments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCommitments(data || [])
    } catch (error) {
      console.error("Error fetching commitments:", error)
      setCommitments([])
    } finally {
      setLoading(false)
    }
  }
  const [individual, setIndividual] = useState<any>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "rejected":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      case "rejected":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Approved"
      case "pending":
        return "Pending Review"
      case "rejected":
        return "Rejected"
      default:
        return "Unknown"
    }
  }

  // Fetch commitments
  const fetchData = async () => {
    try {
      if (!user) return

      // Fetch commitments for this user directly
      const { data: commitmentsData, error: commitmentsError } = await supabase
        .from("commitments")
        .select(`
        *,
        pledges (
          id,
          yearly_missionary_support,
          yearly_special_support,
          missionaries_committed
        )
      `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (commitmentsError) {
        console.error("Error fetching commitments:", commitmentsError)
      } else {
        setCommitments(commitmentsData || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // If user is not authenticated, redirect to home
    if (!user || !profile) {
      router.push("/")
      return
    }

    // If user is not a supporter, redirect to dashboard
    if (profile.role !== "supporter") {
      router.push("/dashboard")
      return
    }

    // If user is a supporter but phone not verified, redirect to verification
    if (profile.role === "supporter" && !profile.is_phone_verified) {
      router.push("/verify-phone")
      return
    }

    fetchData()
  }, [user, profile, router])

  if (loading) {
    return (
      <SupporterDashboardLayout title="My Commitments" subtitle="Track your commitment submissions and approvals">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupporterDashboardLayout>
    )
  }

  const approvedCommitments = commitments.filter((c) => c.status === "approved")
  const pendingCommitments = commitments.filter((c) => c.status === "pending")
  const rejectedCommitments = commitments.filter((c) => c.status === "rejected")

  const totalApprovedAmount = approvedCommitments.reduce((sum, commitment) => sum + (commitment.amount || 0), 0)

  return (
    <SupporterDashboardLayout
      title="My Commitments"
      subtitle="Track your commitment submissions and approvals"
      action={
        <Button onClick={() => router.push("/supporter-dashboard/pledges")} variant="outline">
          <ArrowRight className="mr-2 h-4 w-4" />
          View My Pledges
        </Button>
      }
    >
      <div className="space-y-6">
        {commitments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Commitments Yet</CardTitle>
              <CardDescription>
                You haven't submitted any commitments yet. Visit your pledges page to make your first commitment.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => router.push("/supporter-dashboard/pledges")}>
                <Upload className="mr-2 h-4 w-4" /> View My Pledges
                <ArrowRight className="mr-2 h-4 w-4" />
                View My Pledges
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <SupporterMetricCard
                title="Total Commitments"
                value={commitments.length}
                subtitle="All submissions"
                icon={<FileText className="h-5 w-5" />}
                color="blue"
              />
              <SupporterMetricCard
                title="Approved Amount"
                value={formatCurrency(totalApprovedAmount)}
                subtitle="Total approved value"
                icon={<CheckCircle className="h-5 w-5" />}
                color="green"
              />
              <SupporterMetricCard
                title="Pending Review"
                value={pendingCommitments.length}
                subtitle="Awaiting approval"
                icon={<Clock className="h-5 w-5" />}
                color="yellow"
              />
              <SupporterMetricCard
                title="Approval Rate"
                value={`${commitments.length > 0 ? Math.round((approvedCommitments.length / commitments.length) * 100) : 0}%`}
                subtitle="Success rate"
                icon={<CheckCircle className="h-5 w-5" />}
                color="purple"
              />
            </div>

            {/* Commitments List */}
            <div className="space-y-4">
              {commitments.map((commitment) => (
                <Card key={commitment.id} className="overflow-hidden">
                  <div className={`h-2 ${getStatusColor(commitment.status)}`}></div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{formatCurrency(commitment.amount || 0)}</CardTitle>
                        <CardDescription>
                          Submitted on {new Date(commitment.created_at).toLocaleDateString()}
                          {commitment.pledges && (
                            <>
                              {" • "}
                              Supporting {commitment.pledges.missionaries_committed || 0}{" "}
                              {commitment.pledges.missionaries_committed === 1 ? "missionary" : "missionaries"}
                            </>
                          )}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          commitment.status === "approved"
                            ? "default"
                            : commitment.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                        className="flex items-center gap-1"
                      >
                        {getStatusIcon(commitment.status)}
                        {getStatusText(commitment.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                        <span>Date: {new Date(commitment.commitment_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4 text-gray-400" />
                        <span>Amount: {formatCurrency(commitment.amount || 0)}</span>
                      </div>
                      <div className="flex items-center">
                        <FileText className="mr-2 h-4 w-4 text-gray-400" />
                        <span>Method: {commitment.commitment_method || "Not specified"}</span>
                      </div>
                    </div>

                    {commitment.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Notes:</strong> {commitment.notes}
                        </p>
                      </div>
                    )}

                    {commitment.admin_notes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600">
                          <strong>Admin Notes:</strong> {commitment.admin_notes}
                        </p>
                      </div>
                    )}

                    {commitment.status === "rejected" && commitment.rejection_reason && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-600">
                          <strong>Rejection Reason:</strong> {commitment.rejection_reason}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </SupporterDashboardLayout>
  )
}
