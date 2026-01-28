"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, Calendar, DollarSign, Clock, Users, Upload } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SupporterDashboardLayout } from "@/components/supporter-dashboard-layout"
import { SupporterMetricCard } from "@/components/supporter-metric-card"
import { AddPledgeModalSupporter } from "@/components/add-pledge-modal-supporter"
import { MakeCommitmentModal } from "@/components/make-commitment-modal"

export default function SupporterPledgesPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [pledges, setPledges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [individual, setIndividual] = useState<any>(null)
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false)
  const [selectedPledge, setSelectedPledge] = useState<any>(null)
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (fulfillmentStatus: number) => {
    if (fulfillmentStatus >= 100) return "bg-green-500"
    if (fulfillmentStatus >= 75) return "bg-blue-500"
    if (fulfillmentStatus >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getStatusText = (fulfillmentStatus: number) => {
    if (fulfillmentStatus >= 100) return "Completed"
    if (fulfillmentStatus >= 75) return "On Track"
    if (fulfillmentStatus >= 50) return "Behind"
    return "Needs Attention"
  }

  // Handle pledge creation success
  const handlePledgeCreated = () => {
    fetchData()
  }

  const handleCommitmentSuccess = () => {
    fetchData()
  }

  const openCommitmentModal = (pledge: any) => {
    setSelectedPledge(pledge)
    setIsCommitmentModalOpen(true)
  }

  // Fetch individual and pledges
  const fetchData = async () => {
    try {
      if (!user) return

      // Try to find individual by user_id first (most reliable)
      const { data: individualByUserId, error: errorByUserId } = await supabase
        .from("individuals")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()

      // If not found, try by individual_id from user metadata
      if (!individualByUserId && user.user_metadata?.individual_id) {
        const { data: individualById, error: errorById } = await supabase
          .from("individuals")
          .select("*")
          .eq("id", user.user_metadata.individual_id)
          .maybeSingle()

        if (errorById) {
          console.error("Error fetching individual by ID:", errorById)
        } else {
          individualByUserId = individualById
        }
      }

      // Set individual if found
      if (individualByUserId) {
        setIndividual(individualByUserId)

        // Fetch pledges for this individual
        const { data: pledgesData, error: pledgesError } = await supabase
          .from("pledges")
          .select("*")
          .eq("individual_id", individualByUserId.id)
          .order("created_at", { ascending: false })

        if (pledgesError) {
          console.error("Error fetching pledges:", pledgesError)
        } else {
          setPledges(pledgesData || [])
        }
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
      <SupporterDashboardLayout title="My Pledges" subtitle="Manage your missionary support commitments">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupporterDashboardLayout>
    )
  }

  return (
    <SupporterDashboardLayout
      title="My Pledges"
      subtitle="Manage your missionary support commitments"
      action={
        <Button onClick={() => setIsPledgeModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Pledge
        </Button>
      }
    >
      {/* Pledge Modal */}
      {individual && (
        <AddPledgeModalSupporter
          isOpen={isPledgeModalOpen}
          onClose={() => setIsPledgeModalOpen(false)}
          individual={individual}
          onSuccess={handlePledgeCreated}
        />
      )}

      {/* Commitment Modal */}
      {selectedPledge && (
        <MakeCommitmentModal
          isOpen={isCommitmentModalOpen}
          onClose={() => setIsCommitmentModalOpen(false)}
          pledgeId={selectedPledge.id}
          pledgeAmount={selectedPledge.yearly_missionary_support + (selectedPledge.yearly_special_support || 0)}
          onSuccess={handleCommitmentSuccess}
        />
      )}

      <div className="space-y-6">
        {pledges.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Pledges Yet</CardTitle>
              <CardDescription>
                You haven't made any pledges yet. Create your first pledge to support our missionaries.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => setIsPledgeModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First Pledge
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <SupporterMetricCard
                title="Total Pledges"
                value={pledges.length}
                subtitle="All commitments"
                icon={<DollarSign className="h-5 w-5" />}
                color="blue"
              />
              <SupporterMetricCard
                title="Total Yearly Amount"
                value={formatCurrency(
                  pledges.reduce(
                    (sum, pledge) =>
                      sum + (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0),
                    0,
                  ),
                )}
                subtitle="Combined yearly support"
                icon={<DollarSign className="h-5 w-5" />}
                color="green"
              />
              <SupporterMetricCard
                title="Missionaries Supported"
                value={pledges.reduce((sum, pledge) => sum + (pledge.missionaries_committed || 0), 0)}
                subtitle="Total missionaries"
                icon={<Users className="h-5 w-5" />}
                color="purple"
              />
              <SupporterMetricCard
                title="Average Fulfillment"
                value={`${Math.round(
                  pledges.reduce((sum, pledge) => sum + (pledge.fulfillment_status || 0), 0) / pledges.length,
                )}%`}
                subtitle="Completion rate"
                icon={<Calendar className="h-5 w-5" />}
                color="orange"
              />
            </div>

            {/* Pledges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pledges.map((pledge) => (
                <Card key={pledge.id} className="overflow-hidden">
                  <div className={`h-2 ${getStatusColor(pledge.fulfillment_status)}`}></div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">
                        {formatCurrency((pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0))}
                      </CardTitle>
                      <Badge variant={pledge.fulfillment_status >= 75 ? "default" : "destructive"} className="text-xs">
                        {getStatusText(pledge.fulfillment_status)}
                      </Badge>
                    </div>
                    <CardDescription>
                      {pledge.missionaries_committed > 0 && (
                        <>
                          Supporting {pledge.missionaries_committed}{" "}
                          {pledge.missionaries_committed === 1 ? "missionary" : "missionaries"}
                        </>
                      )}
                      {pledge.special_support_amount > 0 && (
                        <>
                          {pledge.missionaries_committed > 0 && " • "}
                          Special support included
                        </>
                      )}
                      {pledge.in_kind_support && (
                        <>
                          {(pledge.missionaries_committed > 0 || pledge.special_support_amount > 0) && " • "}
                          In-kind support
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                          <span>Started</span>
                        </div>
                        <span className="font-medium">{new Date(pledge.date_of_commitment).toLocaleDateString()}</span>
                      </div>

                      {pledge.frequency && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-gray-400" />
                            <span>Frequency</span>
                          </div>
                          <span className="font-medium capitalize">{pledge.frequency}</span>
                        </div>
                      )}

                      {pledge.amount_per_frequency > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <DollarSign className="mr-2 h-4 w-4 text-gray-400" />
                            <span>Per {pledge.frequency}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(pledge.amount_per_frequency)}</span>
                        </div>
                      )}

                      {pledge.missionaries_committed > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Users className="mr-2 h-4 w-4 text-gray-400" />
                            <span>Missionaries</span>
                          </div>
                          <span className="font-medium">{pledge.missionaries_committed}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Fulfillment</span>
                          <span>{pledge.fulfillment_status}%</span>
                        </div>
                        <Progress value={pledge.fulfillment_status} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => openCommitmentModal(pledge)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Make Commitment
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </SupporterDashboardLayout>
  )
}
