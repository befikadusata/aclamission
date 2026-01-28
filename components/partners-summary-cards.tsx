"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, UserCheck, Star } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"

interface SummaryData {
  totalPartners: number
  totalAgreements: number
  totalMissionaries: number
  specialSupportAgreements: number
}

export function PartnersSummaryCards() {
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalPartners: 0,
    totalAgreements: 0,
    totalMissionaries: 0,
    specialSupportAgreements: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummaryData()
  }, [])

  const fetchSummaryData = async () => {
    try {
      setLoading(true)

      // Get total partners
      const { count: partnersCount, error: partnersError } = await supabase
        .from("partners")
        .select("*", { count: "exact", head: true })

      if (partnersError) throw partnersError

      // Get agreements data
      const { data: agreements, error: agreementsError } = await supabase.from("agreements").select("*")

      if (agreementsError) throw agreementsError

      // Calculate total agreements
      const totalAgreements = agreements?.length || 0

      // Calculate special support agreements
      const specialSupportAgreements =
        agreements?.filter((agreement) => agreement.support_type === "special_support").length || 0

      // Calculate total missionaries
      const totalMissionaries =
        agreements?.reduce((sum, agreement) => sum + (agreement.number_of_missionaries || 0), 0) || 0

      setSummaryData({
        totalPartners: partnersCount || 0,
        totalAgreements,
        totalMissionaries,
        specialSupportAgreements,
      })
    } catch (error) {
      console.error("Error fetching summary data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : summaryData.totalPartners}</div>
          <p className="text-xs text-muted-foreground">Active mission partners</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Agreements</CardTitle>
          <FileText className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : summaryData.totalAgreements}</div>
          <p className="text-xs text-muted-foreground">Signed partnership agreements</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Missionaries</CardTitle>
          <UserCheck className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : summaryData.totalMissionaries}</div>
          <p className="text-xs text-muted-foreground">Supported missionaries</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Special Support</CardTitle>
          <Star className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? "..." : summaryData.specialSupportAgreements}</div>
          <p className="text-xs text-muted-foreground">Special support agreements</p>
        </CardContent>
      </Card>
    </div>
  )
}
