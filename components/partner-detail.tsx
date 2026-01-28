"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Edit,
  Plus,
} from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { AgreementsTable } from "./agreements-table"
import { MissionariesTable } from "./missionaries-table"

type Partner = Database["public"]["Tables"]["partners"]["Row"]
type Agreement = Database["public"]["Tables"]["agreements"]["Row"]
type Missionary = Database["public"]["Tables"]["missionaries"]["Row"]

interface PartnerDetailProps {
  partnerId: string
  onEdit: (partner: Partner) => void
  onAddAgreement: (partner: Partner) => void
  onUploadReport: (partner: Partner) => void
  onUploadReceipt: (partner: Partner) => void
  onClose: () => void
}

export function PartnerDetail({
  partnerId,
  onEdit,
  onAddAgreement,
  onUploadReport,
  onUploadReceipt,
  onClose,
}: PartnerDetailProps) {
  const [partner, setPartner] = useState<Partner | null>(null)
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [missionaries, setMissionaries] = useState<Missionary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()

  useEffect(() => {
    fetchPartnerData()
  }, [partnerId, refreshTrigger])

  const fetchPartnerData = async () => {
    try {
      setLoading(true)

      // Fetch partner details
      const { data: partnerData, error: partnerError } = await supabase
        .from("partners")
        .select("*")
        .eq("id", partnerId)
        .single()

      if (partnerError) throw partnerError

      // Fetch agreements
      const { data: agreementsData, error: agreementsError } = await supabase
        .from("agreements")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })

      if (agreementsError) throw agreementsError

      // Fetch missionaries
      const { data: missionariesData, error: missionariesError } = await supabase
        .from("missionaries")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })

      if (missionariesError) throw missionariesError

      setPartner(partnerData)
      setAgreements(agreementsData || [])
      setMissionaries(missionariesData || [])
    } catch (error) {
      console.error("Error fetching partner data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch partner data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getTotalAgreementValue = () => {
    return agreements.reduce((sum, agreement) => sum + Number(agreement.total_amount || 0), 0)
  }

  const getActiveAgreements = () => {
    return agreements.filter((agreement) => agreement.status === "active")
  }

  const getTotalMissionaries = () => {
    return agreements.reduce((sum, agreement) => sum + (agreement.number_of_missionaries || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading partner details...</div>
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Partner not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Partners
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
            <p className="text-muted-foreground">Partner Details & Management</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(partner)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Partner
          </Button>
          <Button onClick={() => onAddAgreement(partner)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Agreement
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agreements</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agreements.length}</div>
            <p className="text-xs text-muted-foreground">{getActiveAgreements().length} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl lg:text-2xl font-bold break-words overflow-hidden">
              {formatCurrency(getTotalAgreementValue())}
            </div>
            <p className="text-xs text-muted-foreground truncate">All agreements combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missionaries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalMissionaries()}</div>
            <p className="text-xs text-muted-foreground">Total missionaries supported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partnership Since</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partner.created_at ? new Date(partner.created_at).getFullYear() : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {partner.created_at ? new Date(partner.created_at).toLocaleDateString() : "Date not available"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Partner Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Partner Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{partner.name}</div>
                    <div className="text-sm text-muted-foreground">Organization Name</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{partner.country || "Not specified"}</div>
                    <div className="text-sm text-muted-foreground">Country</div>
                  </div>
                </div>
                {partner.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <div className="font-medium">{partner.address}</div>
                      <div className="text-sm text-muted-foreground">Address</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="space-y-3">
                {partner.contact_person_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{partner.contact_person_name}</div>
                      <div className="text-sm text-muted-foreground">Contact Person</div>
                    </div>
                  </div>
                )}
                {partner.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{partner.contact_phone}</div>
                      <div className="text-sm text-muted-foreground">Phone Number</div>
                    </div>
                  </div>
                )}
                {partner.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{partner.contact_email}</div>
                      <div className="text-sm text-muted-foreground">Email Address</div>
                    </div>
                  </div>
                )}
                {!partner.contact_person_name && !partner.contact_phone && !partner.contact_email && (
                  <div className="text-sm text-muted-foreground">No contact information available</div>
                )}
              </div>
            </div>

            {/* Status & Metadata */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Status & Details</h4>
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-sm mb-1">Status</div>
                  <Badge variant={partner.status === "active" ? "default" : "secondary"}>{partner.status}</Badge>
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Created</div>
                  <div className="text-sm text-muted-foreground">
                    {partner.created_at ? new Date(partner.created_at).toLocaleDateString() : "Not available"}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Last Updated</div>
                  <div className="text-sm text-muted-foreground">
                    {partner.updated_at ? new Date(partner.updated_at).toLocaleDateString() : "Not available"}
                  </div>
                </div>
                {partner.notes && (
                  <div>
                    <div className="font-medium text-sm mb-1">Notes</div>
                    <div className="text-sm text-muted-foreground">{partner.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for detailed information */}
      <Tabs defaultValue="agreements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="missionaries">Missionaries</TabsTrigger>
        </TabsList>

        <TabsContent value="agreements" className="space-y-4">
          <AgreementsTable partnerId={partnerId} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="missionaries" className="space-y-4">
          <MissionariesTable partnerId={partnerId} refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
