"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase-client"

export function DashboardCharts() {
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [pledgeData, setPledgeData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
  }, [])

  async function fetchChartData() {
    try {
      // Fetch bank transactions for monthly inflow/outflow
      const { data: transactions } = await supabase
        .from("bank_transactions")
        .select("credit_amount, debit_amount, transaction_date")
        .order("transaction_date", { ascending: true })

      // Fetch pledges for frequency analysis
      const { data: pledges } = await supabase.from("pledges").select("frequency, fulfillment_status")

      if (transactions) {
        // Process monthly data
        const monthlyMap = new Map()

        transactions.forEach((transaction) => {
          const date = new Date(transaction.transaction_date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          const monthName = date.toLocaleDateString("en-US", { month: "short" })

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
              name: monthName,
              inflow: 0,
              outflow: 0,
            })
          }

          const monthData = monthlyMap.get(monthKey)
          monthData.inflow += transaction.credit_amount || 0
          monthData.outflow += Math.abs(transaction.debit_amount || 0)
        })

        // Get last 12 months of data
        const sortedMonthlyData = Array.from(monthlyMap.values()).slice(-12)
        setMonthlyData(sortedMonthlyData)
      }

      if (pledges) {
        // Process pledge frequency data
        const frequencyMap = new Map()

        pledges.forEach((pledge) => {
          const frequency = pledge.frequency || "one-time"
          const fulfillmentStatus = pledge.fulfillment_status || 0

          if (!frequencyMap.has(frequency)) {
            frequencyMap.set(frequency, {
              name: frequency.charAt(0).toUpperCase() + frequency.slice(1),
              fulfilled: 0,
              unfulfilled: 0,
            })
          }

          const freqData = frequencyMap.get(frequency)
          if (fulfillmentStatus >= 100) {
            freqData.fulfilled += 1
          } else {
            freqData.unfulfilled += 1
          }
        })

        setPledgeData(Array.from(frequencyMap.values()))
      }
    } catch (error) {
      console.error("Error fetching chart data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading charts...</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
              <div className="text-sm text-muted-foreground">Loading charts...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg truncate">Monthly Inflow vs Outflow</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:pl-2">
          <ChartContainer
            config={{
              inflow: {
                label: "Inflow",
                color: "hsl(var(--chart-1))",
              },
              outflow: {
                label: "Outflow",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[250px] sm:h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tick={{ fontSize: 12 }} />
                <YAxis
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                    return value.toString()
                  }}
                />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: any) => [
                    new Intl.NumberFormat("en-ET", {
                      style: "currency",
                      currency: "ETB",
                      minimumFractionDigits: 0,
                    }).format(value),
                    "",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="inflow"
                  stroke="var(--color-inflow)"
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                />
                <Line type="monotone" dataKey="outflow" stroke="var(--color-outflow)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg truncate">Pledge Fulfillment by Frequency</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:pl-2">
          <ChartContainer
            config={{
              fulfilled: {
                label: "Fulfilled",
                color: "hsl(var(--chart-1))",
              },
              unfulfilled: {
                label: "Unfulfilled",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[250px] sm:h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pledgeData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} tick={{ fontSize: 12 }} />
                <YAxis fontSize={12} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="fulfilled" stackId="a" fill="var(--color-fulfilled)" />
                <Bar dataKey="unfulfilled" stackId="a" fill="var(--color-unfulfilled)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
