"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"

interface SummaryData {
  totalRequested: number
  totalApproved: number
  totalFinalized: number
  totalCount: number
}

export function OutgoingsSummaryCards() {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalRequested: 0,
    totalApproved: 0,
    totalFinalized: 0,
    totalCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummaryData()
  }, [])

  const fetchSummaryData = async () => {
    try {
      const { data: outgoings, error } = await supabase.from("outgoings").select("amount, status")

      if (error) throw error

      const summary = outgoings?.reduce(
        (acc, outgoing) => {
          acc.totalCount++
          switch (outgoing.status) {
            case "requested":
              acc.totalRequested += Number(outgoing.amount)
              break
            case "approved":
              acc.totalApproved += Number(outgoing.amount)
              break
            case "finalized":
              acc.totalFinalized += Number(outgoing.amount)
              break
          }
          return acc
        },
        {
          totalRequested: 0,
          totalApproved: 0,
          totalFinalized: 0,
          totalCount: 0,
        },
      ) || {
        totalRequested: 0,
        totalApproved: 0,
        totalFinalized: 0,
        totalCount: 0,
      }

      setSummaryData(summary)
    } catch (error) {
      console.error("Error fetching summary data:", error)
    } finally {
      setLoading(false)
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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(summaryData.totalRequested)}</div>
          <p className="text-xs text-muted-foreground">Pending approval</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(summaryData.totalApproved)}</div>
          <p className="text-xs text-muted-foreground">Ready for transfer</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Finalized</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(summaryData.totalFinalized)}</div>
          <p className="text-xs text-muted-foreground">Completed transfers</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : summaryData.totalCount}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>
    </div>
  )
}
