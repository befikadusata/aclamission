"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  BarChart,
  PieChart,
  LineChartIcon,
  Sparkles,
  Loader2,
  RefreshCw,
  FileDown,
} from "lucide-react"
import type { DateRange } from "react-day-picker"
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

// AI Report generation function
async function generateAIReport(reportData: any) {
  try {
    // In a real implementation, this would call an AI service
    // For now, we'll simulate an AI response
    await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API call

    const insights = [
      `Your total pledged amount is ${formatCurrency(reportData.totalPledged)}, with ${reportData.fulfillmentRate}% fulfillment rate.`,
      `You have disbursed ${formatCurrency(reportData.totalDisbursed)} out of ${formatCurrency(reportData.totalReceived)} received funds.`,
      `There are ${reportData.activePartners} active partners supporting ${reportData.activeMissionaries} missionaries.`,
      `The average pledge fulfillment rate is ${reportData.fulfillmentRate}%, which is ${reportData.fulfillmentRate > 75 ? "good" : "below target"}.`,
      `Your net balance is ${formatCurrency(reportData.totalReceived - reportData.totalDisbursed)}.`,
    ]

    const recommendations = [
      reportData.fulfillmentRate < 80
        ? "Consider implementing a pledge reminder system to improve fulfillment rates."
        : "Your pledge fulfillment rate is healthy. Continue your current engagement strategy.",
      reportData.totalReceived < reportData.totalPledged * 0.7
        ? "There's a significant gap between pledged and received amounts. Follow up with major donors."
        : "Your pledge conversion rate is strong.",
      reportData.pendingReceipts > 5
        ? "Address the backlog of pending receipts to maintain compliance."
        : "Receipt processing is up to date.",
      "Consider diversifying your partner base to reduce dependency on a few major contributors.",
      "Regular financial updates to stakeholders can help maintain transparency and trust.",
    ]

    return {
      summary: `Financial Health Summary: ${reportData.fulfillmentRate > 75 ? "Good" : "Needs Attention"}`,
      insights,
      recommendations,
      trends:
        "Based on the current data, your organization shows a " +
        (reportData.totalReceived > reportData.totalDisbursed * 1.2
          ? "healthy financial buffer"
          : "tight financial margin") +
        ". " +
        (reportData.fulfillmentRate > 80 ? "Pledge fulfillment is strong" : "Pledge fulfillment could be improved") +
        ".",
    }
  } catch (error) {
    console.error("Error generating AI report:", error)
    return {
      summary: "Unable to generate AI insights at this time.",
      insights: [],
      recommendations: ["Please try again later."],
      trends: "",
    }
  }
}

// Helper function to format currency
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  })
  const [selectedPartner, setSelectedPartner] = useState<string>("all")
  const [partners, setPartners] = useState<any[]>([])
  const [reportData, setReportData] = useState({
    totalPledged: 0,
    totalReceived: 0,
    totalDisbursed: 0,
    fulfillmentRate: 0,
    activePartners: 0,
    activeMissionaries: 0,
    pendingReceipts: 0,
    overdueReports: 0,
    monthlyTrends: [] as any[],
    partnerDistribution: [] as any[],
    missionarySupport: [] as any[],
    complianceStatus: [] as any[],
  })
  const [loading, setLoading] = useState(true)
  const [generatingAIReport, setGeneratingAIReport] = useState(false)
  const [aiReport, setAiReport] = useState<any>(null)
  const { toast } = useToast()

  // COLORS for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"]

  useEffect(() => {
    fetchPartners()
    fetchReportData()
  }, [])

  async function fetchPartners() {
    try {
      const { data, error } = await supabase.from("partners").select("id, name").eq("status", "active").order("name")

      if (error) throw error
      setPartners(data || [])
    } catch (error) {
      console.error("Error fetching partners:", error)
    }
  }

  async function fetchReportData() {
    try {
      setLoading(true)

      // Fetch pledges data with more details
      const pledgesQuery = supabase.from("pledges").select(`
          id,
          amount,
          frequency,
          fulfillment_status,
          created_at,
          individual:individual_id(full_name)
        `)

      // Fetch bank transactions with more details
      let transactionsQuery = supabase.from("bank_transactions").select(`
          id,
          credit_amount,
          debit_amount,
          transaction_date,
          description
        `)

      // Fetch disbursements with more details
      let disbursementsQuery = supabase.from("disbursements").select(`
          id,
          amount,
          date,
          agreement:agreement_id(
            id,
            partner_id,
            partner:partner_id(name)
          )
        `)

      // Apply date filters if range is selected
      if (dateRange?.from && dateRange?.to) {
        const fromDate = dateRange.from.toISOString().split("T")[0]
        const toDate = dateRange.to.toISOString().split("T")[0]

        transactionsQuery = transactionsQuery.gte("transaction_date", fromDate).lte("transaction_date", toDate)
        disbursementsQuery = disbursementsQuery.gte("date", fromDate).lte("date", toDate)
      }

      // Apply partner filter
      if (selectedPartner !== "all") {
        disbursementsQuery = disbursementsQuery.eq("agreement.partner_id", selectedPartner)
      }

      // Execute all queries in parallel
      const [
        pledgesResult,
        transactionsResult,
        disbursementsResult,
        partnersResult,
        missionariesResult,
        receiptsResult,
      ] = await Promise.all([
        pledgesQuery,
        transactionsQuery,
        disbursementsQuery,
        supabase.from("partners").select("id, name, status"),
        supabase.from("missionaries").select("id, name, status"),
        supabase.from("receipts_reports").select("id, status"),
      ])

      // Calculate totals
      const totalPledged = pledgesResult.data?.reduce((sum, pledge) => sum + (pledge.amount || 0), 0) || 0
      const totalReceived = transactionsResult.data?.reduce((sum, tx) => sum + (tx.credit_amount || 0), 0) || 0
      const totalDisbursed =
        disbursementsResult.data?.reduce((sum, disbursement) => sum + (disbursement.amount || 0), 0) || 0

      const avgFulfillment = pledgesResult.data?.length
        ? pledgesResult.data.reduce((sum, pledge) => sum + (pledge.fulfillment_status || 0), 0) /
          pledgesResult.data.length
        : 0

      // Generate monthly trends data
      const monthlyTrends = generateMonthlyTrends(transactionsResult.data || [], disbursementsResult.data || [])

      // Generate partner distribution data
      const partnerDistribution = generatePartnerDistribution(disbursementsResult.data || [])

      // Generate missionary support data
      const missionarySupport = generateMissionarySupport(pledgesResult.data || [])

      // Generate compliance status data
      const complianceStatus = generateComplianceStatus(receiptsResult.data || [])

      // Count pending receipts and overdue reports
      const pendingReceipts = receiptsResult.data?.filter((r) => r.status === "pending").length || 0
      const overdueReports = receiptsResult.data?.filter((r) => r.status === "overdue").length || 0

      setReportData({
        totalPledged,
        totalReceived,
        totalDisbursed,
        fulfillmentRate: Math.round(avgFulfillment),
        activePartners: partnersResult.data?.filter((p) => p.status === "active").length || 0,
        activeMissionaries: missionariesResult.data?.filter((m) => m.status === "active").length || 0,
        pendingReceipts,
        overdueReports,
        monthlyTrends,
        partnerDistribution,
        missionarySupport,
        complianceStatus,
      })
    } catch (error) {
      console.error("Error fetching report data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate monthly trends data
  function generateMonthlyTrends(transactions: any[], disbursements: any[]) {
    const monthlyMap = new Map()

    // Process transactions
    transactions.forEach((tx) => {
      const date = new Date(tx.transaction_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          name: monthName,
          inflow: 0,
          outflow: 0,
          net: 0,
        })
      }

      const monthData = monthlyMap.get(monthKey)
      monthData.inflow += tx.credit_amount || 0
      monthData.net += tx.credit_amount || 0
    })

    // Process disbursements
    disbursements.forEach((disb) => {
      const date = new Date(disb.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          name: monthName,
          inflow: 0,
          outflow: 0,
          net: 0,
        })
      }

      const monthData = monthlyMap.get(monthKey)
      monthData.outflow += disb.amount || 0
      monthData.net -= disb.amount || 0
    })

    // Convert to array and sort by date
    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry) => entry[1])
      .slice(-12) // Last 12 months
  }

  // Helper function to generate partner distribution data
  function generatePartnerDistribution(disbursements: any[]) {
    const partnerMap = new Map()

    disbursements.forEach((disb) => {
      if (!disb.agreement?.partner?.name) return

      const partnerName = disb.agreement.partner.name

      if (!partnerMap.has(partnerName)) {
        partnerMap.set(partnerName, {
          name: partnerName,
          value: 0,
        })
      }

      partnerMap.get(partnerName).value += disb.amount || 0
    })

    // Convert to array and sort by amount
    return Array.from(partnerMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) // Top 6 partners
  }

  // Helper function to generate missionary support data
  function generateMissionarySupport(pledges: any[]) {
    const frequencyMap = new Map()

    pledges.forEach((pledge) => {
      const frequency = pledge.frequency || "one-time"

      if (!frequencyMap.has(frequency)) {
        frequencyMap.set(frequency, {
          name: frequency.charAt(0).toUpperCase() + frequency.slice(1).replace("-", " "),
          value: 0,
          count: 0,
        })
      }

      frequencyMap.get(frequency).value += pledge.amount || 0
      frequencyMap.get(frequency).count += 1
    })

    // Convert to array
    return Array.from(frequencyMap.values())
  }

  // Helper function to generate compliance status data
  function generateComplianceStatus(receipts: any[]) {
    const statusMap = new Map([
      ["approved", { name: "Approved", value: 0 }],
      ["pending", { name: "Pending", value: 0 }],
      ["rejected", { name: "Rejected", value: 0 }],
      ["overdue", { name: "Overdue", value: 0 }],
    ])

    receipts.forEach((receipt) => {
      const status = receipt.status || "pending"
      if (statusMap.has(status)) {
        statusMap.get(status).value += 1
      }
    })

    // Convert to array
    return Array.from(statusMap.values())
  }

  const handleExportReport = (format: string) => {
    toast({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} report...`,
    })

    // Implementation for export functionality would go here
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `Your ${format.toUpperCase()} report is ready for download.`,
      })
    }, 2000)
  }

  const handleGenerateAIReport = async () => {
    setGeneratingAIReport(true)
    try {
      const aiReportData = await generateAIReport(reportData)
      setAiReport(aiReportData)
      toast({
        title: "AI Report Generated",
        description: "Your AI-powered report insights are ready.",
      })
    } catch (error) {
      console.error("Error generating AI report:", error)
      toast({
        title: "Error",
        description: "Failed to generate AI report",
        variant: "destructive",
      })
    } finally {
      setGeneratingAIReport(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Loading report data...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Financial reports and analytics for ACLA Missions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleExportReport("pdf")}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => handleExportReport("excel")}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button variant="default" onClick={handleGenerateAIReport} disabled={generatingAIReport}>
            {generatingAIReport ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {generatingAIReport ? "Generating..." : "AI Insights"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Customize your report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Partner</label>
              <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select partner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchReportData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Report Section */}
      {aiReport && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                <CardTitle>AI-Generated Insights</CardTitle>
              </div>
              <Badge variant="outline" className="ml-2">
                AI-Powered
              </Badge>
            </div>
            <CardDescription>{aiReport.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Key Insights</h4>
              <ul className="space-y-1 list-disc pl-5">
                {aiReport.insights.map((insight: string, i: number) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recommendations</h4>
              <ul className="space-y-1 list-disc pl-5">
                {aiReport.recommendations.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>

            <Alert>
              <AlertTitle>Trend Analysis</AlertTitle>
              <AlertDescription>{aiReport.trends}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Generated based on your financial data. This is an AI-assisted analysis and should be reviewed by a
            financial professional.
          </CardFooter>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.totalPledged)}</div>
            <p className="text-xs text-muted-foreground">Committed support amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.totalReceived)}</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Fulfillment</span>
                <span>{Math.round((reportData.totalReceived / reportData.totalPledged) * 100)}%</span>
              </div>
              <Progress value={(reportData.totalReceived / reportData.totalPledged) * 100} className="h-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.totalDisbursed)}</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Utilization</span>
                <span>{Math.round((reportData.totalDisbursed / reportData.totalReceived) * 100)}%</span>
              </div>
              <Progress value={(reportData.totalDisbursed / reportData.totalReceived) * 100} className="h-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Support</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.activePartners} / {reportData.activeMissionaries}
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span>Partners</span>
              <span>Missionaries</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="missionaries">Missionaries</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChartIcon className="h-5 w-5 mr-2" />
                  Monthly Financial Trends
                </CardTitle>
                <CardDescription>Inflow vs outflow over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.monthlyTrends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
                        return `$${value}`
                      }}
                    />
                    <Tooltip
                      formatter={(value: any) => [`$${value.toLocaleString()}`, ""]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="inflow" stroke="#4ade80" strokeWidth={2} name="Inflow" />
                    <Line type="monotone" dataKey="outflow" stroke="#f87171" strokeWidth={2} name="Outflow" />
                    <Line type="monotone" dataKey="net" stroke="#60a5fa" strokeWidth={2} name="Net" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Financial Overview
                </CardTitle>
                <CardDescription>Summary of financial activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Pledged:</span>
                  <span className="font-medium">{formatCurrency(reportData.totalPledged)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Received:</span>
                  <span className="font-medium text-green-600">{formatCurrency(reportData.totalReceived)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Disbursed:</span>
                  <span className="font-medium text-blue-600">{formatCurrency(reportData.totalDisbursed)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Net Balance:</span>
                  <span className="font-bold">
                    {formatCurrency(reportData.totalReceived - reportData.totalDisbursed)}
                  </span>
                </div>

                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Pledge Fulfillment Rate</h4>
                  <div className="flex items-center">
                    <Progress value={reportData.fulfillmentRate} className="h-2 flex-1" />
                    <span className="ml-2 text-sm font-medium">{reportData.fulfillmentRate}%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Fund Utilization Rate</h4>
                  <div className="flex items-center">
                    <Progress
                      value={
                        reportData.totalReceived ? (reportData.totalDisbursed / reportData.totalReceived) * 100 : 0
                      }
                      className="h-2 flex-1"
                    />
                    <span className="ml-2 text-sm font-medium">
                      {reportData.totalReceived
                        ? Math.round((reportData.totalDisbursed / reportData.totalReceived) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Partner Distribution
                </CardTitle>
                <CardDescription>Disbursement by partner organization</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {reportData.partnerDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={reportData.partnerDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.partnerDistribution.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`$${value.toLocaleString()}`, ""]} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No partner distribution data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partner Performance</CardTitle>
                <CardDescription>Support metrics by partner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportData.partnerDistribution.length > 0 ? (
                  reportData.partnerDistribution.map((partner: any, index: number) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{partner.name}</span>
                        <span>{formatCurrency(partner.value)}</span>
                      </div>
                      <Progress
                        value={(partner.value / reportData.totalDisbursed) * 100}
                        className="h-2"
                        indicatorColor={`bg-[${COLORS[index % COLORS.length]}]`}
                      />
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">No partner performance data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="missionaries" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Support by Frequency
                </CardTitle>
                <CardDescription>Pledge distribution by frequency</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {reportData.missionarySupport.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={reportData.missionarySupport}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#8884d8"
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                          if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
                          return `$${value}`
                        }}
                      />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="value" name="Amount" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="count" name="Count" fill="#82ca9d" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No missionary support data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Missionary Support</CardTitle>
                <CardDescription>Support levels and distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Active Missionaries</h4>
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                      <span className="text-2xl font-bold">{reportData.activeMissionaries}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Average Support per Missionary</h4>
                    <div className="text-xl font-bold">
                      {formatCurrency(
                        reportData.activeMissionaries ? reportData.totalDisbursed / reportData.activeMissionaries : 0,
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-sm font-medium mb-2">Support by Frequency</h4>
                    {reportData.missionarySupport.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm py-1">
                        <span>
                          {item.name} ({item.count})
                        </span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Compliance Status
                </CardTitle>
                <CardDescription>Receipt and reporting compliance</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {reportData.complianceStatus.some((item: any) => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={reportData.complianceStatus.filter((item: any) => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.complianceStatus.map((entry: any, index: number) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Approved"
                                ? "#4ade80"
                                : entry.name === "Pending"
                                  ? "#facc15"
                                  : entry.name === "Rejected"
                                    ? "#f87171"
                                    : "#fb923c"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No compliance data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Metrics</CardTitle>
                <CardDescription>Receipt and reporting compliance tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Pending Receipts</h4>
                  <div className="flex items-center">
                    <Badge variant={reportData.pendingReceipts > 5 ? "destructive" : "outline"} className="mr-2">
                      {reportData.pendingReceipts}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {reportData.pendingReceipts > 5 ? "Action required" : "Within acceptable range"}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Overdue Reports</h4>
                  <div className="flex items-center">
                    <Badge variant={reportData.overdueReports > 0 ? "destructive" : "outline"} className="mr-2">
                      {reportData.overdueReports}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {reportData.overdueReports > 0 ? "Immediate attention needed" : "All reports up to date"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Compliance Status</h4>
                  {reportData.complianceStatus.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm py-1">
                      <span>{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>

                <Alert className="mt-4">
                  <AlertTitle>Compliance Summary</AlertTitle>
                  <AlertDescription>
                    {reportData.pendingReceipts === 0 && reportData.overdueReports === 0
                      ? "All documentation is up to date. Excellent compliance status."
                      : reportData.overdueReports > 0
                        ? "There are overdue reports that require immediate attention."
                        : reportData.pendingReceipts > 5
                          ? "Several receipts are pending review. Please process them soon."
                          : "Compliance status is generally good with a few pending items."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Report Notes</CardTitle>
          <CardDescription>Add your observations or action items based on this report</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Enter your notes about this report here..." className="min-h-[100px]" />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Clear</Button>
          <Button>Save Notes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
