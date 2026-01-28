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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Trash2, User, Plus, Eye, Edit, Upload } from "lucide-react"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { AddMissionaryModal } from "./add-missionary-modal"
import { MissionaryDetailModal } from "./missionary-detail-modal"
import { EditMissionaryModal } from "./edit-missionary-modal"
import { MissionaryUploadModal } from "./missionary-upload-modal"

type Missionary = Database["public"]["Tables"]["missionaries"]["Row"] & {
  agreements?: {
    id: string
    agreement_code: string
    type: string
  } | null
}

interface MissionariesTableProps {
  partnerId: string
  refreshTrigger?: number
}

export function MissionariesTable({ partnerId, refreshTrigger }: MissionariesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Missionary[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedMissionary, setSelectedMissionary] = useState<Missionary | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchMissionaries()
  }, [partnerId, refreshTrigger])

  const fetchMissionaries = async () => {
    try {
      setLoading(true)
      console.log("Fetching missionaries for partner:", partnerId)

      const { data: missionaries, error } = await supabase
        .from("missionaries")
        .select(`
          *,
          agreements:agreement_id (
            id,
            agreement_code,
            type
          )
        `)
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Missionaries fetch error:", error)
        toast({
          title: "Error",
          description: `Failed to fetch missionaries: ${error.message}`,
          variant: "destructive",
        })
        return
      }

      console.log("Fetched missionaries:", missionaries)
      setData(missionaries || [])
    } catch (error) {
      console.error("Missionaries fetch error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching missionaries",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (missionary: Missionary) => {
    try {
      // First check if missionary has any disbursements
      const { data: disbursements, error: disbursementError } = await supabase
        .from("disbursements")
        .select("id")
        .eq("missionary_id", missionary.id)
        .limit(1)

      if (disbursementError) {
        console.error("Error checking disbursements:", disbursementError)
        toast({
          title: "Error",
          description: "Failed to check missionary dependencies",
          variant: "destructive",
        })
        return
      }

      const hasDependencies = disbursements && disbursements.length > 0

      if (hasDependencies) {
        toast({
          title: "Cannot Delete Missionary",
          description: `This missionary has associated disbursements. Please remove these records first before deleting the missionary.`,
          variant: "destructive",
        })
        return
      }

      // If no dependencies, proceed with confirmation and deletion
      if (!confirm(`Are you sure you want to delete missionary ${missionary.name}? This action cannot be undone.`))
        return

      const { error } = await supabase.from("missionaries").delete().eq("id", missionary.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Missionary deleted successfully",
      })

      fetchMissionaries()
    } catch (error) {
      console.error("Error deleting missionary:", error)
      toast({
        title: "Error",
        description: "Failed to delete missionary. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddSuccess = () => {
    setIsAddModalOpen(false)
    fetchMissionaries()
  }

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    setSelectedMissionary(null)
    fetchMissionaries()
  }

  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false)
    fetchMissionaries()
  }

  const handleView = (missionary: Missionary) => {
    setSelectedMissionary(missionary)
    setIsDetailModalOpen(true)
  }

  const handleEdit = (missionary: Missionary) => {
    setSelectedMissionary(missionary)
    setIsEditModalOpen(true)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "on_leave":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "ETB 0.00"
    return `ETB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const columns: ColumnDef<Missionary>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const missionary = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={missionary.photo_url || ""} alt={missionary.name} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{missionary.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "area_of_ministry",
      header: "Area of Ministry",
      cell: ({ row }) => {
        const area = row.getValue("area_of_ministry") as string
        return <div>{area || "Not specified"}</div>
      },
    },
    {
      accessorKey: "region",
      header: "Region",
      cell: ({ row }) => {
        const region = row.getValue("region") as string
        return <div>{region || "Not specified"}</div>
      },
    },
    {
      accessorKey: "monthly_support_amount",
      header: "Monthly Support",
      cell: ({ row }) => {
        const amount = row.getValue("monthly_support_amount") as number
        return <div className="font-medium">{formatCurrency(amount)}</div>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return <Badge variant={getStatusBadgeVariant(status) as any}>{status || "active"}</Badge>
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Added
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("created_at") as string
        return <div>{new Date(date).toLocaleDateString()}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const missionary = row.original

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
              <DropdownMenuItem onClick={() => handleView(missionary)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(missionary)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Missionary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(missionary.id)}>
                Copy Missionary ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(missionary)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Missionary
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
            <div className="text-muted-foreground">Loading missionaries...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Missionaries
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadModalOpen(true)} variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Missionaries
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Missionary
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4 gap-4">
          <Input
            placeholder="Filter by name..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
            className="max-w-sm"
          />
          <Input
            placeholder="Filter by region..."
            value={(table.getColumn("region")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("region")?.setFilterValue(event.target.value)}
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
                    No missionaries found for this partner.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} missionary(ies) total.
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

      <AddMissionaryModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        partnerId={partnerId}
        onSuccess={handleAddSuccess}
      />

      {selectedMissionary && (
        <>
          <MissionaryDetailModal
            open={isDetailModalOpen}
            onOpenChange={setIsDetailModalOpen}
            missionary={selectedMissionary}
          />
          <EditMissionaryModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            missionary={selectedMissionary}
            onSuccess={handleEditSuccess}
          />
        </>
      )}
      <MissionaryUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        partnerId={partnerId}
        onSuccess={handleUploadSuccess}
      />
    </Card>
  )
}
