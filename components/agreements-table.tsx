"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, MoreHorizontal, Eye, Trash2, FileText } from "lucide-react"

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AgreementDetailModal } from "./agreement-detail-modal"

type Agreement = Database["public"]["Tables"]["agreements"]["Row"]

interface AgreementsTableProps {
  partnerId: string
  refreshTrigger?: number
}

export function AgreementsTable({ partnerId, refreshTrigger }: AgreementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchAgreements()
  }, [partnerId, refreshTrigger])

  const fetchAgreements = async () => {
    try {
      setLoading(true)
      const { data: agreements, error } = await supabase
        .from("agreements")
        .select("*")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Agreements fetch error:", error)
        toast({
          title: "Error",
          description: "Failed to fetch agreements",
          variant: "destructive",
        })
        return
      }

      setData(agreements || [])
    } catch (error) {
      console.error("Agreements fetch error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewAgreement = (agreement: Agreement) => {
    setSelectedAgreement(agreement)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (agreement: Agreement) => {
    if (!confirm(`Are you sure you want to delete agreement ${agreement.agreement_code}?`)) return

    try {
      const { error } = await supabase.from("agreements").delete().eq("id", agreement.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Agreement deleted successfully",
      })

      fetchAgreements()
    } catch (error) {
      console.error("Error deleting agreement:", error)
      toast({
        title: "Error",
        description: "Failed to delete agreement",
        variant: "destructive",
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "completed":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "annual":
        return "default"
      case "one_time_special":
        return "secondary"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Agreement>[] = [
    {
      accessorKey: "agreement_code",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Agreement Code
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">{row.getValue("agreement_code")}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <Badge variant={getTypeBadgeVariant(type) as any}>{type === "annual" ? "Annual" : "One-Time Special"}</Badge>
        )
      },
    },
    {
      accessorKey: "support_type",
      header: "Support Type",
      cell: ({ row }) => {
        const supportType = row.getValue("support_type") as string
        return (
          <Badge variant={supportType === "missionary_support" ? "default" : "secondary"}>
            {supportType === "missionary_support" ? "Missionary" : "Special"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Total Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = row.getValue("total_amount") as number
        return <div className="font-medium">{formatCurrency(amount || 0)}</div>
      },
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => {
        const frequency = row.getValue("frequency") as string
        return <Badge variant="outline">{frequency}</Badge>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return <Badge variant={getStatusBadgeVariant(status) as any}>{status}</Badge>
      },
    },
    {
      accessorKey: "start_date",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Start Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("start_date") as string
        return <div>{date ? new Date(date).toLocaleDateString() : "Not set"}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const agreement = row.original

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
              <DropdownMenuItem onClick={() => handleViewAgreement(agreement)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(agreement.id)}>
                Copy Agreement ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(agreement)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Agreement
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading agreements...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Agreements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter by agreement code..."
            value={(table.getColumn("agreement_code")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("agreement_code")?.setFilterValue(event.target.value)}
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
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                    No agreements found for this partner.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} agreement(s) total.
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

      <AgreementDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        agreement={selectedAgreement}
      />
    </Card>
  )
}
