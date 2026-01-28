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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Edit, FileText, Upload, Plus, Eye } from "lucide-react"

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
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

type Partner = Database["public"]["Tables"]["partners"]["Row"] & {
  missionary_count?: number
  active_agreements?: number
  total_disbursed?: number
  last_report_date?: string | null
}

interface PartnersTableProps {
  onViewPartner: (partner: Partner) => void
  onEditPartner: (partner: Partner) => void
  onAddAgreement: (partner: Partner) => void
  onUploadReport: (partner: Partner) => void
  onUploadReceipt: (partner: Partner) => void
  refreshTrigger?: number
}

export function PartnersTable({
  onViewPartner,
  onEditPartner,
  onAddAgreement,
  onUploadReport,
  onUploadReceipt,
  refreshTrigger,
}: PartnersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPartners()
  }, [refreshTrigger])

  async function fetchPartners() {
    try {
      setLoading(true)

      // Fetch partners with basic info first
      const { data: partners, error } = await supabase.from("partners").select("*").order("name", { ascending: true })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch partners",
          variant: "destructive",
        })
        return
      }

      // For each partner, fetch related data separately
      const transformedData = await Promise.all(
        (partners || []).map(async (partner) => {
          // Get all agreements for this partner
          const { data: agreements } = await supabase.from("agreements").select("*").eq("partner_id", partner.id)

          // Calculate total missionaries across all agreements
          const totalMissionaries =
            agreements?.reduce((sum, agreement) => {
              return sum + (agreement.number_of_missionaries || 0)
            }, 0) || 0

          // Count active agreements
          const activeAgreements = agreements?.filter((a) => a.status === "active").length || 0

          // Calculate total disbursed from outgoings linked to agreements
          let totalDisbursed = 0
          if (agreements && agreements.length > 0) {
            const { data: outgoings } = await supabase
              .from("outgoings")
              .select("amount")
              .in(
                "agreement_id",
                agreements.map((a) => a.id),
              )

            totalDisbursed = outgoings?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0
          }

          // Get last report date
          const { data: lastReport } = await supabase
            .from("receipts_reports")
            .select("upload_date")
            .eq("partner_id", partner.id)
            .eq("type", "report")
            .order("upload_date", { ascending: false })
            .limit(1)
            .single()

          return {
            ...partner,
            missionary_count: totalMissionaries,
            active_agreements: activeAgreements,
            total_disbursed: totalDisbursed,
            last_report_date: lastReport?.upload_date || null,
          }
        }),
      )

      setData(transformedData)
    } catch (error) {
      console.error("Error fetching partners:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
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
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const columns: ColumnDef<Partner>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Partner Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return <Badge variant="outline">{type === "church" ? "Church" : "Mission Organization"}</Badge>
      },
    },
    {
      accessorKey: "country",
      header: "Country",
      cell: ({ row }) => <div>{row.getValue("country") || "Not specified"}</div>,
    },
    {
      accessorKey: "contact_person_name",
      header: "Contact Person",
      cell: ({ row }) => <div>{row.getValue("contact_person_name") || "Not provided"}</div>,
    },
    {
      accessorKey: "missionary_count",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Missionaries
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("missionary_count")}</div>,
    },
    {
      accessorKey: "active_agreements",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Active Agreements
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="text-center">{row.getValue("active_agreements")}</div>,
    },
    {
      accessorKey: "total_disbursed",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Total Disbursed (ETB)
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("total_disbursed") || "0")
        return <div className="font-medium">{formatCurrency(amount)}</div>
      },
    },
    {
      accessorKey: "last_report_date",
      header: "Last Report",
      cell: ({ row }) => {
        const date = row.getValue("last_report_date") as string | null
        return <div>{date ? new Date(date).toLocaleDateString() : "No reports"}</div>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string

        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
        if (status === "inactive") badgeVariant = "secondary"
        else if (status === "suspended") badgeVariant = "destructive"

        return <Badge variant={badgeVariant}>{status || "active"}</Badge>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const partner = row.original

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
              <DropdownMenuItem onClick={() => onViewPartner(partner)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditPartner(partner)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Partner
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUploadReport(partner)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUploadReceipt(partner)}>
                <FileText className="mr-2 h-4 w-4" />
                Upload Receipt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAddAgreement(partner)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Agreement
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
            <div className="text-muted-foreground">Loading partners...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter by name..."
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
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer"
                    onClick={() => onViewPartner(row.original)}
                  >
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
            {table.getFilteredRowModel().rows.length} partner(s) total.
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
  )
}
