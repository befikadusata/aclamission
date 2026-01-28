"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Mail, Phone, Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { PledgeDetailsModal } from "@/components/pledge-details-modal"
import { EditPledgeModal } from "@/components/edit-pledge-modal"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"

type Pledge = Database["public"]["Tables"]["pledges"]["Row"]

interface PledgeWithFulfillment extends Pledge {
  actualFulfillmentRate: number
  totalReceived: number
}

interface PledgesTableProps {
  refreshTrigger?: number
}

export function PledgesTable({ refreshTrigger }: PledgesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<PledgeWithFulfillment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPledge, setSelectedPledge] = useState<Pledge | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { toast } = useToast()

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleDeletePledge = (pledge: Pledge) => {
    setSelectedPledge(pledge)
    setIsDeleteModalOpen(true)
  }

  const deletePledge = async () => {
    if (!selectedPledge) return

    // First, unlink any bank transactions
    await supabase.from("bank_transactions").update({ pledge_id: null }).eq("pledge_id", selectedPledge.id)

    // Then delete the pledge
    const { error } = await supabase.from("pledges").delete().eq("id", selectedPledge.id)

    if (error) {
      throw error
    }

    toast({
      title: "Success",
      description: `Pledge for "${selectedPledge.full_name}" has been deleted.`,
    })

    fetchPledges()
  }

  const columns: ColumnDef<PledgeWithFulfillment>[] = [
    {
      accessorKey: "full_name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Full Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("full_name")}</div>,
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      cell: ({ row }) => <div className="flex items-center">{row.getValue("phone_number") || "N/A"}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div>{row.getValue("email") || "N/A"}</div>,
    },
    {
      accessorKey: "date_of_commitment",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Date of Commitment
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("date_of_commitment") as string
        return <div>{date ? new Date(date).toLocaleDateString() : "N/A"}</div>
      },
    },
    {
      accessorKey: "missionaries_committed",
      header: "Missionaries",
      cell: ({ row }) => <div className="text-center">{row.getValue("missionaries_committed")}</div>,
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("frequency")}</Badge>,
    },
    {
      id: "yearly_support",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Yearly Support
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const pledge = row.original
        const yearlyTotal = (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)
        return <div className="font-medium">{formatCurrency(yearlyTotal)}</div>
      },
    },
    {
      accessorKey: "special_support_amount",
      header: "Special Support",
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("special_support_amount") || "0")
        if (amount === 0) return <div className="text-muted-foreground">None</div>
        return <div>{formatCurrency(amount)}</div>
      },
    },
    {
      accessorKey: "in_kind_support",
      header: "In-Kind Support",
      cell: ({ row }) => {
        const hasInKind = row.getValue("in_kind_support") as boolean
        return <Badge variant={hasInKind ? "default" : "outline"}>{hasInKind ? "Yes" : "No"}</Badge>
      },
    },
    {
      id: "fulfillment_rate",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Fulfillment Rate
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const pledge = row.original
        const rate = pledge.actualFulfillmentRate

        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
        if (rate >= 100) badgeVariant = "default"
        else if (rate >= 75) badgeVariant = "secondary"
        else if (rate >= 50) badgeVariant = "outline"
        else badgeVariant = "destructive"

        return <Badge variant={badgeVariant}>{rate}%</Badge>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const pledge = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedPledge(pledge)
                  setIsDetailsModalOpen(true)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedPledge(pledge)
                  setIsEditModalOpen(true)
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Pledge
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeletePledge(pledge)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Pledge
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  toast({
                    title: "Email Reminder Sent",
                    description: `Email reminder sent to ${pledge.full_name}`,
                  })
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email Reminder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast({
                    title: "SMS Reminder Sent",
                    description: `SMS reminder sent to ${pledge.full_name}`,
                  })
                }}
              >
                <Phone className="mr-2 h-4 w-4" />
                Send SMS Reminder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  useEffect(() => {
    fetchPledges()
  }, [refreshTrigger])

  async function fetchPledges() {
    try {
      const { data: pledges, error: pledgesError } = await supabase
        .from("pledges")
        .select("*")
        .order("created_at", { ascending: false })

      if (pledgesError) {
        throw pledgesError
      }

      // Fetch bank transactions to calculate actual fulfillment
      const { data: transactions, error: transactionsError } = await supabase
        .from("bank_transactions")
        .select("pledge_id, credit_amount")
        .not("pledge_id", "is", null)

      if (transactionsError) {
        throw transactionsError
      }

      // Group transactions by pledge_id
      const transactionsByPledge = new Map<string, number>()
      transactions?.forEach((transaction) => {
        const pledgeId = transaction.pledge_id!
        const amount = Number.parseFloat(transaction.credit_amount) || 0
        transactionsByPledge.set(pledgeId, (transactionsByPledge.get(pledgeId) || 0) + amount)
      })

      // Calculate actual fulfillment rates
      const pledgesWithFulfillment: PledgeWithFulfillment[] = (pledges || []).map((pledge) => {
        const totalReceived = transactionsByPledge.get(pledge.id) || 0
        const yearlyCommitment = (pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0)
        const actualFulfillmentRate = yearlyCommitment > 0 ? Math.round((totalReceived / yearlyCommitment) * 100) : 0

        return {
          ...pledge,
          actualFulfillmentRate,
          totalReceived,
        }
      })

      setData(pledgesWithFulfillment)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch pledges",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditSuccess = () => {
    fetchPledges()
  }

  const handleEditFromDetails = (pledge: Pledge) => {
    setIsDetailsModalOpen(false)
    setSelectedPledge(pledge)
    setIsEditModalOpen(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading pledges...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center py-4">
            <Input
              placeholder="Filter by name..."
              value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("full_name")?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} pledge(s) total.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PledgeDetailsModal
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        pledge={selectedPledge}
        onEdit={handleEditFromDetails}
      />

      <EditPledgeModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        pledge={selectedPledge}
        onSuccess={handleEditSuccess}
      />

      <DeleteConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Pledge"
        description="This will permanently delete the pledge and unlink any associated bank transactions."
        itemName={selectedPledge?.full_name || ""}
        deleteAction={deletePledge}
      />
    </>
  )
}
