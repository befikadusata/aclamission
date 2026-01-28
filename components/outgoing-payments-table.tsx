"use client"

import { useState } from "react"
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, FileText, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

// Sample data for outgoing payments
const data: OutgoingPayment[] = [
  {
    id: "1",
    missionaryName: "John Smith",
    partnerOrganization: "Global Missions Inc.",
    paymentType: "Partner-Level",
    paymentFrequency: "Monthly",
    lastPaymentDate: "2024-01-15",
    supportAmount: 500,
    agreementUrl: "#",
    renewalStatus: "Active",
  },
  {
    id: "2",
    missionaryName: "Mary Johnson",
    partnerOrganization: "Hope International",
    paymentType: "Individual-Level",
    paymentFrequency: "Quarterly",
    lastPaymentDate: "2023-12-20",
    supportAmount: 1500,
    agreementUrl: "#",
    renewalStatus: "Active",
  },
  {
    id: "3",
    missionaryName: "David Williams",
    partnerOrganization: "Faith Missions",
    paymentType: "Partner-Level",
    paymentFrequency: "Monthly",
    lastPaymentDate: "2024-02-01",
    supportAmount: 600,
    agreementUrl: "#",
    renewalStatus: "Expiring Soon",
  },
  {
    id: "4",
    missionaryName: "Sarah Brown",
    partnerOrganization: null,
    paymentType: "Individual-Level",
    paymentFrequency: "One-Time",
    lastPaymentDate: "2023-11-10",
    supportAmount: 2000,
    agreementUrl: "#",
    renewalStatus: "Expired",
  },
  {
    id: "5",
    missionaryName: "Michael Davis",
    partnerOrganization: "Global Missions Inc.",
    paymentType: "Partner-Level",
    paymentFrequency: "Monthly",
    lastPaymentDate: "2024-01-30",
    supportAmount: 450,
    agreementUrl: "#",
    renewalStatus: "Active",
  },
]

// Define the OutgoingPayment type
type OutgoingPayment = {
  id: string
  missionaryName: string
  partnerOrganization: string | null
  paymentType: "Partner-Level" | "Individual-Level"
  paymentFrequency: "Monthly" | "Quarterly" | "One-Time"
  lastPaymentDate: string
  supportAmount: number
  agreementUrl: string
  renewalStatus: "Active" | "Expiring Soon" | "Expired"
}

export function OutgoingPaymentsTable() {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const { toast } = useToast()

  const columns: ColumnDef<OutgoingPayment>[] = [
    {
      accessorKey: "missionaryName",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Missionary
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => <div className="font-medium">{row.getValue("missionaryName")}</div>,
    },
    {
      accessorKey: "partnerOrganization",
      header: "Partner Organization",
      cell: ({ row }) => {
        const partner = row.getValue("partnerOrganization") as string | null
        return <div>{partner || "Independent"}</div>
      },
    },
    {
      accessorKey: "paymentType",
      header: "Payment Type",
      cell: ({ row }) => <div>{row.getValue("paymentType")}</div>,
    },
    {
      accessorKey: "paymentFrequency",
      header: "Frequency",
      cell: ({ row }) => <div>{row.getValue("paymentFrequency")}</div>,
    },
    {
      accessorKey: "lastPaymentDate",
      header: "Last Payment",
      cell: ({ row }) => {
        const date = new Date(row.getValue("lastPaymentDate"))
        return <div>{date.toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: "supportAmount",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const amount = Number.parseFloat(row.getValue("supportAmount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)

        return <div className="font-medium">{formatted}</div>
      },
    },
    {
      accessorKey: "renewalStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("renewalStatus") as string

        let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default"
        if (status === "Expired") badgeVariant = "destructive"
        else if (status === "Expiring Soon") badgeVariant = "secondary"

        return <Badge variant={badgeVariant}>{status}</Badge>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const payment = row.original

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
                  // View agreement action
                  toast({
                    title: "Viewing Agreement",
                    description: `Opening agreement for ${payment.missionaryName}`,
                  })
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Agreement
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  // Renew agreement action
                  toast({
                    title: "Renew Agreement",
                    description: `Renewing agreement for ${payment.missionaryName}`,
                  })
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Renew Agreement
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center py-4">
          <Input
            placeholder="Filter by missionary..."
            value={(table.getColumn("missionaryName")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("missionaryName")?.setFilterValue(event.target.value)}
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
                    No results.
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
  )
}
