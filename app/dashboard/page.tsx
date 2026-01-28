"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  PlusCircle,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  AlertCircle,
  Clock,
  CheckCircle,
  Upload,
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { AddPledgeModalV41 } from "@/components/add-pledge-modal-v41"
import { DashboardCharts } from "@/components/dashboard-charts"
import type { Database } from "@/lib/supabase"

interface DashboardStats {
  totalPledged: number
  totalReceived: number
  fulfillmentRate: number
  totalIndividuals: number
  totalPledges: number
  activePledges: number
  // New outgoings metrics
  totalOutgoings: number
  pendingOutgoings: number
  approvedOutgoings: number
  finalizedOutgoings: number
  // New bank metrics
  currentBalance: number
  totalInflow: number
  totalOutflow: number
  // New partner metrics
  totalPartners: number
  activePartners: number
  totalAgreements: number
  activeAgreements: number
  totalMissionaries: number
  // New commitment metrics
  pendingCommitments: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPledged: 0,
    totalReceived: 0,
    fulfillmentRate: 0,
    totalIndividuals: 0,
    totalPledges: 0,
    activePledges: 0,
    totalOutgoings: 0,
    pendingOutgoings: 0,
    approvedOutgoings: 0,
    finalizedOutgoings: 0,
    currentBalance: 0,
    totalInflow: 0,
    totalOutflow: 0,
    totalPartners: 0,
    activePartners: 0,
    totalAgreements: 0,
    activeAgreements: 0,
    totalMissionaries: 0,
    pendingCommitments: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    fetchDashboardStats()

    // Set up real-time subscription for new commitments
    const channel = supabase
      .channel("dashboard_commitments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commitments",
        },
        () => {
          // Refresh stats when commitments change
          fetchDashboardStats()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)

      // Fetch all pledges
      const { data: pledges, error: pledgesError } = await supabase.from("pledges").select("*")

      if (pledgesError) throw pledgesError

      // Fetch all individuals
      const { data: individuals, error: individualsError } = await supabase.from("individuals").select("id")

      if (individualsError) throw individualsError

      // Fetch bank transactions to calculate actual received amounts
      const { data: transactions, error: transactionsError } = await supabase
        .from("bank_transactions")
        .select("pledge_id, credit_amount")
        .not("pledge_id", "is", null)

      if (transactionsError) throw transactionsError

      // Calculate total pledged (sum of all yearly support)
      const totalPledged = (pledges || []).reduce((sum, pledge) => {
        return sum + (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)
      }, 0)

      // Calculate total received from bank transactions
      const totalReceived = (transactions || []).reduce((sum, transaction) => {
        return sum + (Number.parseFloat(transaction.credit_amount) || 0)
      }, 0)

      // Calculate fulfillment rate based on actual received vs pledged
      const fulfillmentRate = totalPledged > 0 ? Math.round((totalReceived / totalPledged) * 100) : 0

      // Count active pledges (those with fulfillment < 100%)
      const activePledges = (pledges || []).filter((pledge) => {
        const yearlyCommitment = (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)
        const pledgeTransactions = (transactions || []).filter((t) => t.pledge_id === pledge.id)
        const pledgeReceived = pledgeTransactions.reduce((sum, t) => sum + (Number.parseFloat(t.credit_amount) || 0), 0)
        const pledgeFulfillmentRate = yearlyCommitment > 0 ? (pledgeReceived / yearlyCommitment) * 100 : 0
        return pledgeFulfillmentRate < 100
      }).length

      // Fetch outgoings data
      const { data: outgoings, error: outgoingsError } = await supabase.from("outgoings").select("amount, status")
      if (outgoingsError) throw outgoingsError

      // Calculate outgoings metrics
      const totalOutgoings = (outgoings || []).reduce((sum, outgoing) => sum + (Number(outgoing.amount) || 0), 0)
      const pendingOutgoings = (outgoings || [])
        .filter((o) => o.status === "requested")
        .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
      const approvedOutgoings = (outgoings || [])
        .filter((o) => o.status === "approved")
        .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
      const finalizedOutgoings = (outgoings || [])
        .filter((o) => o.status === "finalized")
        .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)

      // Fetch ALL bank transactions for accurate balance calculation
      const fetchAllBankTransactions = async () => {
        let allTransactions: any[] = []
        let from = 0
        const batchSize = 1000

        while (true) {
          const { data: batch, error } = await supabase
            .from("bank_transactions")
            .select("credit_amount, debit_amount")
            .range(from, from + batchSize - 1)

          if (error) throw error

          if (!batch || batch.length === 0) {
            break
          }

          allTransactions = [...allTransactions, ...batch]

          // If we got less than batchSize, we've reached the end
          if (batch.length < batchSize) {
            break
          }

          from += batchSize
        }

        return allTransactions
      }

      // Calculate bank metrics from ALL transactions
      const allBankTransactions = await fetchAllBankTransactions()
      const totalInflow = allBankTransactions.reduce((sum, t) => sum + (Number(t.credit_amount) || 0), 0)
      const totalOutflow = allBankTransactions.reduce((sum, t) => sum + (Math.abs(Number(t.debit_amount)) || 0), 0)
      const currentBalance = totalInflow - totalOutflow

      // Fetch partners data
      const { data: partners, error: partnersError } = await supabase.from("partners").select("id, status")
      if (partnersError) throw partnersError

      const totalPartners = partners?.length || 0
      const activePartners = (partners || []).filter((p) => p.status === "active" || !p.status).length

      // Fetch agreements data
      const { data: agreements, error: agreementsError } = await supabase
        .from("agreements")
        .select("id, status, number_of_missionaries")
      if (agreementsError) throw agreementsError

      const totalAgreements = agreements?.length || 0
      const activeAgreements = (agreements || []).filter((a) => a.status === "active").length

      // Calculate total missionaries from all agreements
      const totalMissionaries = (agreements || []).reduce((sum, agreement) => {
        return sum + (agreement.number_of_missionaries || 0)
      }, 0)

      // Fetch pending commitments count
      const { count: pendingCommitments, error: commitmentsError } = await supabase
        .from("commitments")
        .select("id", { count: "exact" })
        .eq("status", "pending")

      if (commitmentsError) throw commitmentsError

      setStats({
        totalPledged,
        totalReceived,
        fulfillmentRate,
        totalIndividuals: individuals?.length || 0,
        totalPledges: pledges?.length || 0,
        activePledges,
        totalOutgoings,
        pendingOutgoings,
        approvedOutgoings,
        finalizedOutgoings,
        currentBalance,
        totalInflow,
        totalOutflow,
        totalPartners,
        activePartners,
        totalAgreements,
        activeAgreements,
        totalMissionaries,
        pendingCommitments: pendingCommitments || 0,
      })
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch dashboard statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddSuccess = () => {
    fetchDashboardStats()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of ACLA Missions pledge management system.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of ACLA Missions pledge management system.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Pledge
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pledges Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged (Yearly)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPledged)}</div>
            <p className="text-xs text-muted-foreground">Sum of all yearly support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceived)}</div>
            <p className="text-xs text-muted-foreground">From bank transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pledges</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activePledges}</div>
            <p className="text-xs text-muted-foreground">Pledges {"<"} 100% fulfilled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfillment Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.fulfillmentRate}%</div>
            <p className="text-xs text-muted-foreground">Based on actual receipts</p>
          </CardContent>
        </Card>

        {/* Commitments Section */}
        <Card className={stats.pendingCommitments > 0 ? "border-amber-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commitments</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendingCommitments}</div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs text-amber-600"
              onClick={() => router.push("/dashboard/commitments")}
            >
              View commitments
            </Button>
          </CardContent>
        </Card>

        {/* Outgoings Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outgoings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalOutgoings)}</div>
            <p className="text-xs text-muted-foreground">All payment requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Outgoings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingOutgoings)}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Finalized Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.finalizedOutgoings)}</div>
            <p className="text-xs text-muted-foreground">Completed transfers</p>
          </CardContent>
        </Card>

        {/* Bank Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(stats.currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Net bank balance</p>
          </CardContent>
        </Card>

        {/* Partners Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.totalPartners}</div>
            <p className="text-xs text-muted-foreground">{stats.activePartners} active partners</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agreements</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.activeAgreements}</div>
            <p className="text-xs text-muted-foreground">of {stats.totalAgreements} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Missionaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.totalMissionaries}</div>
            <p className="text-xs text-muted-foreground">Across all agreements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Individuals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{stats.totalIndividuals}</div>
            <p className="text-xs text-muted-foreground">Registered supporters</p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts />

      <AddPledgeModalV41
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        selectedIndividual={null}
        onSuccess={handleAddSuccess}
      />
    </div>
  )
}
