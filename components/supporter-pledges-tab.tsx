"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, PlusCircle, Calendar, DollarSign, Clock, Upload } from 'lucide-react'
import { supabase } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MakeCommitmentModal } from "@/components/make-commitment-modal"

interface SupporterPledgesTabProps {
  individual: any
}

export function SupporterPledgesTab({ individual }: SupporterPledgesTabProps) {
  const [pledges, setPledges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPledge, setSelectedPledge] = useState<any>(null)
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!individual?.id) return

    const fetchPledges = async () => {
      try {
        const { data, error } = await supabase
          .from("pledges")
          .select("*")
          .eq("individual_id", individual.id)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching pledges:", error)
          return
        }

        setPledges(data || [])
      } catch (err) {
        console.error("Error fetching pledges:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPledges()
  }, [individual])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "pending":
        return "bg-yellow-500"
      case "completed":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleMakeCommitment = (pledge: any) => {
    setSelectedPledge(pledge)
    setIsCommitmentModalOpen(true)
  }

  const handleCommitmentSuccess = () => {
    // Refresh pledges data
    if (individual?.id) {
      setLoading(true)
      supabase
        .from("pledges")
        .select("*")
        .eq("individual_id", individual.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setPledges(data)
          }
          setLoading(false)
        })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (pledges.length === 0) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>No Pledges Yet</CardTitle>
          <CardDescription>
            You haven't made any pledges yet. Create your first pledge to support our missionaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => router.push("/supporter-dashboard/new-pledge")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Pledge
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged (Yearly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                pledges.reduce(
                  (sum, pledge) => sum + (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0),
                  0,
                ),
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Pledges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pledges.filter((p) => p.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Missionaries Supported</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pledges.reduce((sum, pledge) => sum + (pledge.missionaries_committed || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-4">Your Pledges</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pledges.map((pledge) => (
          <Card key={pledge.id} className="overflow-hidden">
            <div className={`h-2 ${getStatusColor(pledge.status)}`}></div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">
                  {formatCurrency(pledge.yearly_missionary_support + (pledge.yearly_special_support || 0))}
                </CardTitle>
                <Badge variant={pledge.status === "active" ? "default" : "outline"}>
                  {pledge.status.charAt(0).toUpperCase() + pledge.status.slice(1)}
                </Badge>
              </div>
              <CardDescription>
                Supporting {pledge.missionaries_committed}{" "}
                {pledge.missionaries_committed === 1 ? "missionary" : "missionaries"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Started</span>
                  </div>
                  <span className="font-medium">{new Date(pledge.date_of_commitment).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Frequency</span>
                  </div>
                  <span className="font-medium capitalize">{pledge.frequency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Per {pledge.frequency}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(pledge.amount_per_frequency || 0)}</span>
                </div>
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
              <Button variant="outline" className="w-full" onClick={() => handleMakeCommitment(pledge)}>
                <Upload className="h-4 w-4 mr-2" />
                Make Commitment
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Commitment Modal */}
      {selectedPledge && (
        <MakeCommitmentModal
          isOpen={isCommitmentModalOpen}
          onClose={() => setIsCommitmentModalOpen(false)}
          pledgeId={selectedPledge.id}
          pledgeAmount={selectedPledge.amount_per_frequency || 0}
          onSuccess={handleCommitmentSuccess}
        />
      )}
    </div>
  )
}
