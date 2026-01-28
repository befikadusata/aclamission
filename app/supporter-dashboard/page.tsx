"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, ArrowRight, DollarSign, Users, Calendar, CheckCircle } from 'lucide-react'
import { SupporterDashboardLayout } from "@/components/supporter-dashboard-layout"
import { SupporterMetricCard } from "@/components/supporter-metric-card"
import { AddPledgeModalSupporter } from "@/components/add-pledge-modal-supporter"
import { getOrCreateIndividualForUser } from "@/app/actions/individual-actions"

export default function SupporterDashboardPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [individual, setIndividual] = useState<any>(null)
  const [pledges, setPledges] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalPledged: 0,
    totalReceived: 0,
    activePledges: 0,
    fulfillmentRate: 0,
    missionariesSupported: 0,
  })
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Fetch individual record and stats
  const fetchIndividualAndStats = async () => {
    try {
      if (!user) return

      setLoading(true)
      setError(null)

      // Use the improved function to get or create individual
      const result = await getOrCreateIndividualForUser(
        user.id,
        user.email || "",
        profile
          ? {
              fullName: profile.full_name || user.user_metadata?.full_name || "Unknown",
              phoneNumber: profile.phone_number || user.user_metadata?.phone || "",
            }
          : undefined,
      )

      if (!result.success) {
        setError(result.error || "Failed to load profile")
        setLoading(false)
        return
      }

      setIndividual(result.individual)

      // Fetch pledges for this individual
      const { data: pledgesData, error: pledgesError } = await supabase
        .from("pledges")
        .select("*")
        .eq("individual_id", result.individual.id)
        .order("created_at", { ascending: false })

      if (pledgesError) {
        console.error("Error fetching pledges:", pledgesError)
        setError("Failed to load pledges")
      } else {
        setPledges(pledgesData || [])

        // Calculate stats
        const totalPledged =
          pledgesData?.reduce(
            (sum, pledge) => sum + (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0),
            0,
          ) || 0

        const missionariesSupported =
          pledgesData?.reduce((sum, pledge) => sum + (pledge.missionaries_committed || 0), 0) || 0

        const fulfillmentRate =
          pledgesData && pledgesData.length > 0
            ? Math.round(
                pledgesData.reduce((sum, pledge) => sum + (pledge.fulfillment_status || 0), 0) / pledgesData.length,
              )
            : 0

        setStats({
          totalPledged,
          totalReceived: 0, // This would come from transactions
          activePledges: pledgesData?.length || 0,
          fulfillmentRate,
          missionariesSupported,
        })
      }
    } catch (error) {
      console.error("Error fetching individual:", error)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Handle pledge creation success
  const handlePledgeCreated = () => {
    fetchIndividualAndStats()
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

    fetchIndividualAndStats()
  }, [user, profile, router])

  if (loading) {
    return (
      <SupporterDashboardLayout title="Dashboard" subtitle="Overview of your missionary support">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupporterDashboardLayout>
    )
  }

  if (error) {
    return (
      <SupporterDashboardLayout title="Dashboard" subtitle="Overview of your missionary support">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Profile</CardTitle>
            <CardDescription>
              We encountered an issue loading your profile. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-600">{error}</p>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
          </CardContent>
        </Card>
      </SupporterDashboardLayout>
    )
  }

  return (
    <SupporterDashboardLayout
      title="Dashboard"
      subtitle="Overview of your missionary support"
      action={
        <Button onClick={() => setIsPledgeModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Pledge
        </Button>
      }
    >
      {/* Pledge Modal */}
      <AddPledgeModalSupporter
        isOpen={isPledgeModalOpen}
        onClose={() => setIsPledgeModalOpen(false)}
        individual={individual}
        onSuccess={handlePledgeCreated}
      />

      <div className="space-y-6">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SupporterMetricCard
            title="Total Pledged (Yearly)"
            value={formatCurrency(stats.totalPledged)}
            subtitle="Sum of all yearly support"
            icon={<DollarSign className="h-5 w-5" />}
            color="green"
          />
          <SupporterMetricCard
            title="Total Received"
            value={formatCurrency(stats.totalReceived)}
            subtitle="From bank transactions"
            icon={<DollarSign className="h-5 w-5" />}
            color="blue"
          />
          <SupporterMetricCard
            title="Active Pledges"
            value={stats.activePledges}
            subtitle="Pledges < 100% fulfilled"
            icon={<CheckCircle className="h-5 w-5" />}
            color="red"
          />
          <SupporterMetricCard
            title="Fulfillment Rate"
            value={`${stats.fulfillmentRate}%`}
            subtitle="Based on actual receipts"
            icon={<Calendar className="h-5 w-5" />}
            color="purple"
          />
        </div>

        {/* Recent Pledges */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Pledges</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push("/supporter-dashboard/pledges")}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Your most recent missionary support commitments</CardDescription>
          </CardHeader>
          <CardContent>
            {pledges.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You haven't made any pledges yet.</p>
                <Button onClick={() => setIsPledgeModalOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Pledge
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {pledges.slice(0, 3).map((pledge) => (
                  <div
                    key={pledge.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/supporter-dashboard/pledges/${pledge.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-2 h-10 rounded-full ${
                          pledge.fulfillment_status >= 100
                            ? "bg-green-500"
                            : pledge.fulfillment_status >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium">
                          {formatCurrency(
                            (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0),
                          )}{" "}
                          yearly
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(pledge.date_of_commitment).toLocaleDateString()}
                          {pledge.missionaries_committed > 0 &&
                            ` • ${pledge.missionaries_committed} ${
                              pledge.missionaries_committed === 1 ? "missionary" : "missionaries"
                            }`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{pledge.fulfillment_status}% fulfilled</p>
                      <p className="text-sm text-muted-foreground capitalize">{pledge.frequency || "One-time"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Missionary Support */}
        <Card>
          <CardHeader>
            <CardTitle>Missionary Support</CardTitle>
            <CardDescription>Your impact on missionary work</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-3xl font-bold text-blue-600">{stats.missionariesSupported}</span>
                <span className="text-sm text-blue-700">Missionaries Supported</span>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-3xl font-bold text-green-600">
                  {formatCurrency(stats.totalPledged / (stats.missionariesSupported || 1))}
                </span>
                <span className="text-sm text-green-700">Average Per Missionary</span>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-lg">
                <Calendar className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-3xl font-bold text-purple-600">
                  {pledges.length > 0
                    ? new Date(
                        Math.max(...pledges.map((p) => new Date(p.date_of_commitment).getTime())),
                      ).toLocaleDateString()
                    : "N/A"}
                </span>
                <span className="text-sm text-purple-700">Latest Commitment</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SupporterDashboardLayout>
  )
}
