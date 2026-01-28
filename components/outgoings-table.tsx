"use client"

import { useState, useEffect } from "react"
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, CheckCircle, DollarSign, Edit, FileText } from "lucide-react"

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
import { supabase } from "@/lib/supabase-client"
import { ApprovalModal } from "./approval-modal"
import { FinalizationModal } from "./finalization-modal"
import { OutgoingDetailModal } from "./outgoing-detail-modal"
import { AddOutgoingModal } from "./add-outgoing-modal"

type OutgoingWithRelations = {
  id: string
  type: "missionary_support" | "other"
  title: string
  description: string | null
  amount: number
  paid_amount: number
  paid_status: "unpaid" | "partial" | "paid"
  status: "requested" | "approved" | "finalized"
  request_date: string
  agreement_id: string | null
  expense_category: string | null
  supporting_doc_url: string | null
  created_at: string
  updated_at: string
  agreement?: {
    agreement_code: string
    partner: {
      name: string
    }
  } | null
}

export function OutgoingsTable() {
  const [data, setData] = useState<OutgoingWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [selectedOutgoing, setSelectedOutgoing] = useState<OutgoingWithRelations | null>(null)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [finalizationModalOpen, setFinalizationModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchOutgoings()
  }, [])

  const fetchOutgoings = async () => {
    try {
      setLoading(true)
      const { data: outgoings, error } = await supabase
        .from("outgoings")
        .select(`
          *,
          agreement:agreements(
            agreement_code,
            partner:partners(name)
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setData(outgoings || [])
    } catch (error) {
      console.error("Error fetching outgoings:", error)
      toast({
        title: "Error",
        description: "Failed to fetch outgoings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (outgoing: OutgoingWithRelations) => {
    setSelectedOutgoing(outgoing)
    setApprovalModalOpen(true)
  }

  const handleFinalize = (outgoing: OutgoingWithRelations) => {
    setSelectedOutgoing(outgoing)
    setFinalizationModalOpen(true)
  }

  const handleView = (outgoing: OutgoingWithRelations) => {
    setSelectedOutgoing(outgoing)
    setDetailModalOpen(true)
  }

  const onApprovalSuccess = () => {
    fetchOutgoings()
    setApprovalModalOpen(false)
    setSelectedOutgoing(null)
  }

  const onFinalizationSuccess = () => {
    fetchOutgoings()
    setFinalizationModalOpen(false)
    setSelectedOutgoing(null)
  }

  const onAddSuccess = () => {
    fetchOutgoings()
    setAddModalOpen(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested":
        return <Badge variant="secondary">Requested</Badge>
      case "approved":
        return <Badge variant="default">Approved</Badge>
      case "finalized":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Finalized
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "missionary_support":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700">
            Missionary Support
          </Badge>
        )
      case "other":
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-700">
            Other
          </Badge>
        )
      default:
        return <Badge variant="outline">{type}</Badge>
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

  const columns: ColumnDef<OutgoingWithRelations>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium max-w-[200px] truncate">{row.getValue("title")}</div>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => getTypeBadge(row.getValue("type")),
    },
    {
      accessorKey: "agreement",
      header: "Agreement/Category",
      cell: ({ row }) => {
        const outgoing = row.original
        if (outgoing.type === "missionary_support" && outgoing.agreement) {
          return (
            <div className="text-sm">
              <div className="font-medium">{outgoing.agreement.agreement_code}</div>
              <div className="text-muted-foreground">{outgoing.agreement.partner?.name}</div>
            </div>
          )
        }
        return <div className="text-sm text-muted-foreground">{outgoing.expense_category || "N/A"}</div>
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("amount"))
        const formatted = formatCurrency(amount)
        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "paid_status",
      header: "Payment Status",
      cell: ({ row }) => {
        const outgoing = row.original
        const paidAmount = outgoing.paid_amount || 0
        const totalAmount = outgoing.amount
        const status = outgoing.paid_status

        const getPaymentBadge = () => {
          switch (status) {
            case "paid":
              return (
                <Badge variant="default" className="bg-green-600">
                  Paid
                </Badge>
              )
            case "partial":
              return <Badge variant="secondary">Partial</Badge>
            case "unpaid":
              return <Badge variant="outline">Unpaid</Badge>
            default:
              return <Badge variant="outline">Unknown</Badge>
          }
        }

        return (
          <div className="space-y-1">
            {getPaymentBadge()}
            <div className="text-xs text-muted-foreground">
              {formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "request_date",
      header: "Date Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("request_date"))
        return <div>{date.toLocaleDateString()}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const outgoing = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleView(outgoing)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {outgoing.supporting_doc_url && (
                <DropdownMenuItem onClick={() => window.open(outgoing.supporting_doc_url!, "_blank")}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Document
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {outgoing.status === "requested" && (
                <DropdownMenuItem onClick={() => handleApprove(outgoing)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Payment
                </DropdownMenuItem>
              )}
              {outgoing.status === "approved" && (
                <DropdownMenuItem onClick={() => handleFinalize(outgoing)}>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Finalize Payment
                </DropdownMenuItem>
              )}
              {outgoing.status === "requested" && (
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Payment
                </DropdownMenuItem>
              )}
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading outgoings...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Filter by title..."
                value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                onChange={(event) => table.getColumn("title")?.setFilterValue(event.target.value)}
                className="max-w-sm"
              />
              <Button onClick={() => setAddModalOpen(true)}>Add Payment</Button>
            </div>
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
                      No outgoings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} payment(s) total.
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

      {selectedOutgoing && (
        <>
          <ApprovalModal
            open={approvalModalOpen}
            onOpenChange={setApprovalModalOpen}
            outgoing={selectedOutgoing}
            onSuccess={onApprovalSuccess}
          />
          <FinalizationModal
            open={finalizationModalOpen}
            onOpenChange={setFinalizationModalOpen}
            outgoing={selectedOutgoing}
            onSuccess={onFinalizationSuccess}
          />
          <OutgoingDetailModal open={detailModalOpen} onOpenChange={setDetailModalOpen} outgoing={selectedOutgoing} />
        </>
      )}

      <AddOutgoingModal open={addModalOpen} onOpenChange={setAddModalOpen} onSuccess={onAddSuccess} />
    </>
  )
}

export default OutgoingsTable
