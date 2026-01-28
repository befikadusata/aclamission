"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { format } from "date-fns"
import { Search, Eye, CheckCircle, XCircle, Clock, FileText } from "lucide-react"
import { CommitmentApprovalModal } from "@/components/commitment-approval-modal"

interface Commitment {
  id: string
  pledge_id: string
  user_id: string
  amount: number
  bank: string
  transaction_number: string | null
  receipt_url: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  pledges: {
    id: string
    individuals: {
      name: string
      email: string
    }
  }
}

export default function CommitmentsPage() {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCommitments()

    // Set up real-time subscription
    const channel = supabase
      .channel("commitments_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "commitments",
        },
        () => {
          fetchCommitments()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCommitments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("commitments")
        .select(`
          *,
          pledges!inner(
            id,
            individuals!inner(
              name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setCommitments(data || [])
    } catch (error: any) {
      console.error("Error fetching commitments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch commitments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewCommitment = (commitment: Commitment) => {
    setSelectedCommitment(commitment)
    setIsApprovalModalOpen(true)
  }

  const handleApprovalSuccess = () => {
    fetchCommitments()
    setIsApprovalModalOpen(false)
    setSelectedCommitment(null)
  }

  const filteredCommitments = commitments.filter((commitment) => {
    const matchesSearch =
      commitment.pledges.individuals.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commitment.pledges.individuals.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commitment.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (commitment.transaction_number && commitment.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || commitment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: commitments.length,
    pending: commitments.filter((c) => c.status === "pending").length,
    approved: commitments.filter((c) => c.status === "approved").length,
    rejected: commitments.filter((c) => c.status === "rejected").length,
    totalAmount: commitments.reduce((sum, c) => sum + Number(c.amount), 0),
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Commitments</h1>
            <p className="text-muted-foreground">Review and manage supporter commitments</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">Commitments</h1>
          <p className="text-muted-foreground">Review and manage supporter commitments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commitments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, email, bank, or transaction number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Commitments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commitments ({filteredCommitments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supporter</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Transaction Ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommitments.map((commitment) => (
                <TableRow key={commitment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{commitment.pledges.individuals.name}</div>
                      <div className="text-sm text-muted-foreground">{commitment.pledges.individuals.email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(commitment.amount))}</TableCell>
                  <TableCell>{commitment.bank}</TableCell>
                  <TableCell>{commitment.transaction_number || "N/A"}</TableCell>
                  <TableCell>{getStatusBadge(commitment.status)}</TableCell>
                  <TableCell>{format(new Date(commitment.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleViewCommitment(commitment)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredCommitments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No commitments found matching your criteria.</div>
          )}
        </CardContent>
      </Card>

      {/* Approval Modal */}
      <CommitmentApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false)
          setSelectedCommitment(null)
        }}
        commitment={selectedCommitment}
        onSuccess={handleApprovalSuccess}
      />
    </div>
  )
}
