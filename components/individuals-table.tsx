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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Mail, Phone, Edit, Plus, Users, Trash2 } from "lucide-react"

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
import { EditIndividualModal } from "@/components/edit-individual-modal"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]
type Pledge = Database["public"]["Tables"]["pledges"]["Row"]

interface IndividualWithPledges extends Individual {
  pledges: Pledge[]
  totalYearlyMissionary: number
  totalYearlySpecial: number
  totalYearlySupport: number
  totalFulfilled: number
  actualFulfillmentRate: number
}

interface IndividualsTableProps {
  refreshTrigger?: number
  onAddPledge?: (individual: Individual) => void
  onEditIndividual?: (individual: Individual) => void
  onViewPledges?: (individual: Individual) => void
  onViewDetails?: (individual: Individual) => void
}

export function IndividualsTable({
  refreshTrigger,
  onAddPledge,
  onEditIndividual,
  onViewPledges,
  onViewDetails,
}: IndividualsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<IndividualWithPledges[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedIndividual, setSelectedIndividual] = useState<Individual | null>(null)
  const { toast } = useToast()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const toggleRowExpansion = (individualId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(individualId)) {
      newExpanded.delete(individualId)
    } else {
      newExpanded.add(individualId)
    }
    setExpandedRows(newExpanded)
  }

  const handleEditIndividual = (individual: Individual) => {
    setSelectedIndividual(individual)
    setEditModalOpen(true)
  }

  const handleDeleteIndividual = (individual: Individual) => {
    setSelectedIndividual(individual)
    setDeleteModalOpen(true)
  }

  const deleteIndividual = async () => {
    if (!selectedIndividual) return

    // First, delete all pledges associated with this individual
    const { error: pledgesError } = await supabase.from("pledges").delete().eq("individual_id", selectedIndividual.id)

    if (pledgesError) {
      throw pledgesError
    }

    // Then delete the individual
    const { error: individualError } = await supabase.from("individuals").delete().eq("id", selectedIndividual.id)

    if (individualError) {
      throw individualError
    }

    toast({
      title: "Success",
      description: `Individual "${selectedIndividual.name}" and all associated pledges have been deleted.`,
    })

    fetchIndividualsWithPledges()
  }

  const columns: ColumnDef<IndividualWithPledges>[] = [
    {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const individual = row.original
        const isExpanded = expandedRows.has(individual.id)
        return (
          <Button variant="ghost" size="sm" onClick={() => toggleRowExpansion(individual.id)} className="h-8 w-8 p-0">
            <Users className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </Button>
        )
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Full Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
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
      id: "pledges_count",
      header: "Pledges",
      cell: ({ row }) => {
        const individual = row.original
        return (
          <div className="text-center">
            <Badge variant="outline">{individual.pledges.length}</Badge>
          </div>
        )
      },
    },
    {
      id: "total_yearly_support",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Yearly Support
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const individual = row.original
        return <div className="font-medium text-green-600">{formatCurrency(individual.totalYearlySupport)}</div>
      },
    },
    {
      id: "fulfillment_rate",
      header: "Fulfillment Rate",
      cell: ({ row }) => {
        const individual = row.original
        const rate = individual.actualFulfillmentRate

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
        const individual = row.original

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
              <DropdownMenuItem onClick={() => onViewPledges?.(individual)}>
                <Eye className="mr-2 h-4 w-4" />
                View All Pledges & Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddPledge?.(individual)}>
                <Plus className="mr-2 h-4 w-4" />
                Add New Pledge
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEditIndividual(individual)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Individual
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteIndividual(individual)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Individual
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  toast({
                    title: "Email Sent",
                    description: `Email sent to ${individual.name}`,
                  })
                }}
              >
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toast({
                    title: "SMS Sent",
                    description: `SMS sent to ${individual.name}`,
                  })
                }}
              >
                <Phone className="mr-2 h-4 w-4" />
                Send SMS
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
    fetchIndividualsWithPledges()
  }, [refreshTrigger])

  async function fetchIndividualsWithPledges() {
    try {
      setLoading(true)

      // Fetch individuals with better error handling
      const { data: individuals, error: individualsError } = await supabase
        .from("individuals")
        .select("*")
        .order("created_at", { ascending: false })

      if (individualsError) {
        console.error("Error fetching individuals:", individualsError)
        throw new Error(`Failed to fetch individuals: ${individualsError.message}`)
      }

      // Fetch pledges with better error handling
      const { data: pledges, error: pledgesError } = await supabase.from("pledges").select("*")

      if (pledgesError) {
        console.error("Error fetching pledges:", pledgesError)
        throw new Error(`Failed to fetch pledges: ${pledgesError.message}`)
      }

      // Fetch bank transactions with better error handling
      const { data: transactions, error: transactionsError } = await supabase
        .from("bank_transactions")
        .select("pledge_id, credit_amount")
        .not("pledge_id", "is", null)

      if (transactionsError) {
        console.error("Error fetching transactions:", transactionsError)
        throw new Error(`Failed to fetch transactions: ${transactionsError.message}`)
      }

      // Group pledges by individual_id
      const pledgesByIndividual = new Map<string, Pledge[]>()
      pledges?.forEach((pledge) => {
        if (!pledgesByIndividual.has(pledge.individual_id)) {
          pledgesByIndividual.set(pledge.individual_id, [])
        }
        pledgesByIndividual.get(pledge.individual_id)?.push(pledge)
      })

      // Group transactions by pledge_id
      const transactionsByPledge = new Map<string, number>()
      transactions?.forEach((transaction) => {
        if (transaction.pledge_id) {
          const pledgeId = transaction.pledge_id
          const amount = Number.parseFloat(String(transaction.credit_amount)) || 0
          transactionsByPledge.set(pledgeId, (transactionsByPledge.get(pledgeId) || 0) + amount)
        }
      })

      // Calculate totals for each individual
      const individualsWithTotals: IndividualWithPledges[] = (individuals || []).map((individual) => {
        const individualPledges = pledgesByIndividual.get(individual.id) || []

        const totalYearlyMissionary = individualPledges.reduce((sum, pledge) => {
          return sum + (Number(pledge.yearly_missionary_support) || 0)
        }, 0)

        const totalYearlySpecial = individualPledges.reduce((sum, pledge) => {
          return sum + (Number(pledge.yearly_special_support) || 0)
        }, 0)

        const totalYearlySupport = totalYearlyMissionary + totalYearlySpecial

        // Calculate actual fulfillment based on bank transactions
        const totalReceived = individualPledges.reduce((sum, pledge) => {
          return sum + (transactionsByPledge.get(pledge.id) || 0)
        }, 0)

        const actualFulfillmentRate =
          totalYearlySupport > 0 ? Math.round((totalReceived / totalYearlySupport) * 100) : 0

        // Keep the old calculation for backward compatibility
        const totalFulfilled = individualPledges.reduce((sum, pledge) => {
          const fulfillmentRate = (Number(pledge.fulfillment_status) || 0) / 100
          return sum + totalYearlySupport * fulfillmentRate
        }, 0)

        return {
          ...individual,
          pledges: individualPledges,
          totalYearlyMissionary,
          totalYearlySpecial,
          totalYearlySupport,
          totalFulfilled,
          actualFulfillmentRate,
        }
      })

      setData(individualsWithTotals)
    } catch (error: any) {
      console.error("Error in fetchIndividualsWithPledges:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch individuals data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading individuals...</div>
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
              placeholder="Filter by name, phone, or email..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
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
                        {column.id.replace("_", " ")}
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
                  table.getRowModel().rows.map((row) => {
                    const individual = row.original
                    const isExpanded = expandedRows.has(individual.id)

                    return (
                      <>
                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="p-0">
                              <div className="bg-muted/50 p-4">
                                <h4 className="font-medium mb-3">Pledges for {individual.name}</h4>
                                {individual.pledges.length > 0 ? (
                                  <div className="grid gap-3">
                                    {individual.pledges.map((pledge) => (
                                      <div
                                        key={pledge.id}
                                        className="flex items-center justify-between p-3 bg-background rounded border"
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-4">
                                            <Badge variant="default">Missionary Support</Badge>
                                            <span className="font-medium">
                                              {formatCurrency(pledge.yearly_missionary_support || 0)}/year
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                              {pledge.missionaries_committed} missionaries •{" "}
                                              {pledge.frequency || "No frequency set"}
                                            </span>
                                          </div>
                                          {(pledge.yearly_special_support || 0) > 0 && (
                                            <div className="flex items-center gap-4">
                                              <Badge variant="secondary">Special Support</Badge>
                                              <span className="font-medium">
                                                {formatCurrency(pledge.yearly_special_support || 0)}/year
                                              </span>
                                              <span className="text-sm text-muted-foreground">
                                                {pledge.special_support_frequency}
                                              </span>
                                            </div>
                                          )}
                                          {pledge.in_kind_support && (
                                            <div className="flex items-center gap-4">
                                              <Badge variant="outline">In-Kind Support</Badge>
                                              <span className="text-sm text-muted-foreground">
                                                {pledge.in_kind_support_details}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge variant={pledge.fulfillment_status === 100 ? "default" : "secondary"}>
                                            {pledge.fulfillment_status}% fulfilled
                                          </Badge>
                                          <Button size="sm" variant="outline" onClick={() => onAddPledge?.(individual)}>
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground">
                                    No pledges yet.{" "}
                                    <Button
                                      variant="link"
                                      onClick={() => onAddPledge?.(individual)}
                                      className="p-0 h-auto"
                                    >
                                      Add the first pledge
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No individuals found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} individual(s) total.
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

      <EditIndividualModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        individual={selectedIndividual}
        onSuccess={fetchIndividualsWithPledges}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Individual"
        description="This will permanently delete the individual and all associated pledges."
        itemName={selectedIndividual?.name || ""}
        deleteAction={deleteIndividual}
      />
    </>
  )
}
