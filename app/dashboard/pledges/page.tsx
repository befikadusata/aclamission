"use client"

import { useState, useEffect } from "react"
import { IndividualsTable } from "@/components/individuals-table"
import { AddPledgeModalV41 } from "@/components/add-pledge-modal-v41"
import { EditPledgeModal } from "@/components/edit-pledge-modal"
import { Button } from "@/components/ui/button"
import { PlusCircle, Users, DollarSign, Heart, Target } from "lucide-react"
import type { Database } from "@/lib/supabase"
import { IndividualDetailView } from "@/components/individual-detail-view"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase-client"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]
type Pledge = Database["public"]["Tables"]["pledges"]["Row"]

export default function PledgesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedIndividual, setSelectedIndividual] = useState<Individual | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [detailViewIndividual, setDetailViewIndividual] = useState<Individual | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [editPledgeModalOpen, setEditPledgeModalOpen] = useState(false)
  const [selectedPledge, setSelectedPledge] = useState<Pledge | null>(null)

  const [summaryStats, setSummaryStats] = useState({
    totalYearlyPledged: 0,
    totalMissionariesCommitted: 0,
    totalSpecialSupport: 0,
    numberOfIndividuals: 0,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    const fetchSummaryStats = async () => {
      try {
        // Get all pledges data
        const { data: pledges } = await supabase.from("pledges").select("*")

        if (pledges) {
          // Calculate total yearly amount pledged (same as dashboard)
          const totalYearlyPledged = pledges.reduce((sum, pledge) => {
            return sum + (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)
          }, 0)

          // Calculate total missionaries committed (sum of missionaries_committed field)
          const totalMissionariesCommitted = pledges.reduce((sum, pledge) => {
            return sum + (pledge.missionaries_committed || 0)
          }, 0)

          // Calculate total special support (sum of yearly_special_support)
          const totalSpecialSupport = pledges.reduce((sum, pledge) => {
            return sum + (pledge.yearly_special_support || 0)
          }, 0)

          // Get number of unique individuals with pledges
          const uniqueIndividuals = new Set(pledges.map((p) => p.individual_id).filter(Boolean))

          setSummaryStats({
            totalYearlyPledged,
            totalMissionariesCommitted,
            totalSpecialSupport,
            numberOfIndividuals: uniqueIndividuals.size,
          })
        }
      } catch (error) {
        console.error("Error fetching summary stats:", error)
      }
    }

    fetchSummaryStats()
  }, [refreshKey])

  const handleAddSuccess = () => {
    // Trigger a refresh of the individuals table
    setRefreshKey((prev) => prev + 1)
  }

  const handleAddPledge = (individual?: Individual) => {
    setSelectedIndividual(individual || null)
    setIsAddModalOpen(true)
  }

  const handleEditIndividual = (individual: Individual) => {
    // This is now handled directly in the IndividualsTable component
    console.log("Edit individual:", individual)
  }

  const handleViewPledges = (individual: Individual) => {
    setDetailViewIndividual(individual)
    setIsDetailViewOpen(true)
  }

  const handleEditPledge = (pledge: Pledge) => {
    setSelectedPledge(pledge)
    setEditPledgeModalOpen(true)
  }

  const handleEditPledgeSuccess = () => {
    setRefreshKey((prev) => prev + 1)
    // If detail view is open, we might want to refresh it too
    if (isDetailViewOpen) {
      // The detail view will automatically refresh when the pledge is updated
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pledges Management</h1>
          <p className="text-muted-foreground">Manage individuals and their pledge commitments for ACLA Missions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleAddPledge()}>
            <Users className="mr-2 h-4 w-4" />
            Add Individual
          </Button>
          <Button onClick={() => handleAddPledge()}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Individual & Pledge
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Yearly Amount Pledged</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summaryStats.totalYearlyPledged)}</div>
            <p className="text-xs text-muted-foreground">Sum of all yearly missionary and special support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Missionaries Committed</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summaryStats.totalMissionariesCommitted}</div>
            <p className="text-xs text-muted-foreground">Number of missionaries supported</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Special Support Pledged</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(summaryStats.totalSpecialSupport)}</div>
            <p className="text-xs text-muted-foreground">Yearly special support amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Number of Individuals Pledged</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summaryStats.numberOfIndividuals}</div>
            <p className="text-xs text-muted-foreground">Unique individuals with pledges</p>
          </CardContent>
        </Card>
      </div>

      <IndividualsTable
        refreshTrigger={refreshKey}
        onAddPledge={handleAddPledge}
        onEditIndividual={handleEditIndividual}
        onViewPledges={handleViewPledges}
      />

      <AddPledgeModalV41
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        selectedIndividual={selectedIndividual}
        onSuccess={handleAddSuccess}
      />

      <Dialog open={isDetailViewOpen} onOpenChange={setIsDetailViewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Individual Details</DialogTitle>
          </DialogHeader>
          {detailViewIndividual && (
            <IndividualDetailView
              individual={detailViewIndividual}
              onAddPledge={() => {
                setIsDetailViewOpen(false)
                handleAddPledge(detailViewIndividual)
              }}
              onEditPledge={handleEditPledge}
              onClose={() => setIsDetailViewOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <EditPledgeModal
        open={editPledgeModalOpen}
        onOpenChange={setEditPledgeModalOpen}
        pledge={selectedPledge}
        onSuccess={handleEditPledgeSuccess}
      />
    </div>
  )
}
