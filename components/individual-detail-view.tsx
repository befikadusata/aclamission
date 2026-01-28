"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Calendar, DollarSign, TrendingUp, Users, Gift, Plus, Edit, Mail, Phone, Clock } from "lucide-react"
import { format } from "date-fns"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]
type Pledge = Database["public"]["Tables"]["pledges"]["Row"] & {
  date_of_commitment?: string
}

interface IndividualDetailViewProps {
  individual: Individual
  onAddPledge?: () => void
  onEditPledge?: (pledge: Pledge) => void
  onClose?: () => void
}

interface PledgeWithTransactions extends Pledge {
  linkedTransactions: any[]
  totalReceived: number
  lastPaymentDate: string | null
}

export function IndividualDetailView({ individual, onAddPledge, onEditPledge, onClose }: IndividualDetailViewProps) {
  const [pledges, setPledges] = useState<PledgeWithTransactions[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalYearlyCommitment: 0,
    totalReceived: 0,
    overallFulfillmentRate: 0,
    activePledges: 0,
    totalMissionariesSupported: 0,
  })
  const { toast } = useToast()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set"
    return format(new Date(dateString), "MMM dd, yyyy")
  }

  useEffect(() => {
    fetchIndividualDetails()
  }, [individual.id])

  const fetchIndividualDetails = async () => {
    try {
      setLoading(true)

      // Fetch pledges for this individual
      const { data: pledgesData, error: pledgesError } = await supabase
        .from("pledges")
        .select("*")
        .eq("individual_id", individual.id)
        .order("created_at", { ascending: false })

      if (pledgesError) throw pledgesError

      // Fetch bank transactions linked to these pledges
      const pledgeIds = pledgesData?.map((p) => p.id) || []
      const { data: transactions, error: transactionsError } = await supabase
        .from("bank_transactions")
        .select("*")
        .in("pledge_id", pledgeIds)

      if (transactionsError) throw transactionsError

      // Group transactions by pledge and calculate totals
      const transactionsByPledge = new Map()
      transactions?.forEach((transaction) => {
        if (!transactionsByPledge.has(transaction.pledge_id)) {
          transactionsByPledge.set(transaction.pledge_id, [])
        }
        transactionsByPledge.get(transaction.pledge_id).push(transaction)
      })

      // Enhance pledges with transaction data
      const enhancedPledges: PledgeWithTransactions[] = (pledgesData || []).map((pledge) => {
        const linkedTransactions = transactionsByPledge.get(pledge.id) || []
        const totalReceived = linkedTransactions.reduce(
          (sum: number, t: any) => sum + (Number.parseFloat(t.credit_amount) || 0),
          0,
        )

        const lastPaymentDate =
          linkedTransactions.length > 0
            ? linkedTransactions.sort(
                (a: any, b: any) => new Date(b.value_date).getTime() - new Date(a.value_date).getTime(),
              )[0].value_date
            : null

        return {
          ...pledge,
          linkedTransactions,
          totalReceived,
          lastPaymentDate,
        }
      })

      setPledges(enhancedPledges)

      // Calculate overall statistics
      const totalYearlyCommitment = enhancedPledges.reduce(
        (sum, pledge) => sum + (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0),
        0,
      )

      const totalReceived = enhancedPledges.reduce((sum, pledge) => sum + pledge.totalReceived, 0)

      const overallFulfillmentRate =
        totalYearlyCommitment > 0 ? Math.round((totalReceived / totalYearlyCommitment) * 100) : 0

      const activePledges = enhancedPledges.filter((pledge) => (pledge.fulfillment_status || 0) < 100).length

      const totalMissionariesSupported = enhancedPledges.reduce(
        (sum, pledge) => sum + (pledge.missionaries_committed || 0),
        0,
      )

      setStats({
        totalYearlyCommitment,
        totalReceived,
        overallFulfillmentRate,
        activePledges,
        totalMissionariesSupported,
      })
    } catch (error: any) {
      console.error("Error fetching individual details:", error)
      toast({
        title: "Error",
        description: "Failed to fetch individual details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getPledgeFulfillmentRate = (pledge: PledgeWithTransactions) => {
    const totalCommitment = (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)
    return totalCommitment > 0 ? Math.round((pledge.totalReceived / totalCommitment) * 100) : 0
  }

  const getStatusBadgeVariant = (rate: number) => {
    if (rate >= 100) return "default"
    if (rate >= 75) return "secondary"
    if (rate >= 50) return "outline"
    return "destructive"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading individual details...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Individual Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{individual.name}</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {individual.phone_number && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {individual.phone_number}
                  </div>
                )}
                {individual.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {individual.email}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Member since {formatDate(individual.created_at)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onAddPledge}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pledge
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm font-medium text-muted-foreground">Yearly Commitment</div>
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalYearlyCommitment)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <div className="text-sm font-medium text-muted-foreground">Total Received</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalReceived)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-sm font-medium text-muted-foreground">Fulfillment Rate</div>
            </div>
            <div className="text-2xl font-bold text-purple-600">{stats.overallFulfillmentRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-600" />
              <div className="text-sm font-medium text-muted-foreground">Missionaries</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.totalMissionariesSupported}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-red-600" />
              <div className="text-sm font-medium text-muted-foreground">Active Pledges</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.activePledges}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Fulfillment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {formatCurrency(stats.totalReceived)} of {formatCurrency(stats.totalYearlyCommitment)}
              </span>
              <span className="text-sm font-medium">{stats.overallFulfillmentRate}%</span>
            </div>
            <Progress value={stats.overallFulfillmentRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Pledges List */}
      <Card>
        <CardHeader>
          <CardTitle>Pledge History ({pledges.length} pledges)</CardTitle>
        </CardHeader>
        <CardContent>
          {pledges.length > 0 ? (
            <div className="space-y-4">
              {pledges.map((pledge, index) => {
                const fulfillmentRate = getPledgeFulfillmentRate(pledge)
                const totalCommitment = (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)

                return (
                  <div key={pledge.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Pledge #{index + 1}</Badge>
                        <Badge variant={getStatusBadgeVariant(fulfillmentRate)}>{fulfillmentRate}% fulfilled</Badge>
                        {pledge.date_of_commitment && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Committed: {formatDate(pledge.date_of_commitment)}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => onEditPledge?.(pledge)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Pledge Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Missionary Support */}
                      {(pledge.yearly_missionary_support || 0) > 0 && (
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Missionary Support</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(pledge.yearly_missionary_support || 0)}/year
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {pledge.missionaries_committed} missionaries • {pledge.frequency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(pledge.amount_per_frequency || 0)} per {pledge.frequency?.slice(0, -2)}
                          </div>
                        </div>
                      )}

                      {/* Special Support */}
                      {(pledge.yearly_special_support || 0) > 0 && (
                        <div className="space-y-2">
                          <div className="font-medium text-sm">Special Support</div>
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(pledge.yearly_special_support || 0)}/year
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(pledge.special_support_amount || 0)} per{" "}
                            {pledge.special_support_frequency?.slice(0, -2)}
                          </div>
                        </div>
                      )}

                      {/* In-Kind Support */}
                      {pledge.in_kind_support && (
                        <div className="space-y-2">
                          <div className="font-medium text-sm">In-Kind Support</div>
                          <div className="text-sm text-muted-foreground">
                            {pledge.in_kind_support_details || "Details not provided"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          Progress: {formatCurrency(pledge.totalReceived)} of {formatCurrency(totalCommitment)}
                        </span>
                        <span>{fulfillmentRate}%</span>
                      </div>
                      <Progress value={fulfillmentRate} className="h-2" />
                    </div>

                    {/* Payment History */}
                    {pledge.linkedTransactions.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Recent Payments</div>
                        <div className="space-y-1">
                          {pledge.linkedTransactions
                            .sort((a, b) => new Date(b.value_date).getTime() - new Date(a.value_date).getTime())
                            .slice(0, 3)
                            .map((transaction) => (
                              <div key={transaction.id} className="flex items-center justify-between text-sm">
                                <span>{formatDate(transaction.value_date)}</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(Number.parseFloat(transaction.credit_amount) || 0)}
                                </span>
                              </div>
                            ))}
                          {pledge.linkedTransactions.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{pledge.linkedTransactions.length - 3} more payments
                            </div>
                          )}
                        </div>
                        {pledge.lastPaymentDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Last payment: {formatDate(pledge.lastPaymentDate)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pledge Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                      <span>Created: {formatDate(pledge.created_at)}</span>
                      {pledge.updated_at !== pledge.created_at && <span>Updated: {formatDate(pledge.updated_at)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">No pledges found for this individual.</div>
              <Button onClick={onAddPledge}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Pledge
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
