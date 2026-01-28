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
import { ArrowUpDown, ChevronDown, MoreHorizontal, FileText, Download, Eye, Upload, Trash2 } from "lucide-react"

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
import { DocumentUploadModal } from "./document-upload-modal"

type Document = Database["public"]["Tables"]["documents"]["Row"]

interface DocumentsTableProps {
  partnerId: string
  refreshTrigger?: number
  onUploadReport?: () => void
  onUploadReceipt?: () => void
}

export function DocumentsTable({ partnerId, refreshTrigger, onUploadReport, onUploadReceipt }: DocumentsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadDocumentType, setUploadDocumentType] = useState<"signed_agreement" | "receipt" | "report">("report")

  useEffect(() => {
    fetchDocuments()
  }, [partnerId, refreshTrigger])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const { data: documents, error } = await supabase
        .from("documents")
        .select("*")
        .eq("partner_id", partnerId)
        .order("uploaded_at", { ascending: false })

      if (error) {
        console.error("Documents fetch error:", error)
        toast({
          title: "Error",
          description: "Failed to fetch documents",
          variant: "destructive",
        })
        return
      }

      setData(documents || [])
    } catch (error) {
      console.error("Documents fetch error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete ${document.file_name}?`)) return

    try {
      const { error } = await supabase.from("documents").delete().eq("id", document.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Document deleted successfully",
      })

      fetchDocuments()
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "signed_agreement":
        return "Signed Agreement"
      case "receipt":
        return "Receipt"
      case "report":
        return "Report"
      default:
        return type
    }
  }

  const getDocumentTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "signed_agreement":
        return "default"
      case "receipt":
        return "secondary"
      case "report":
        return "outline"
      default:
        return "outline"
    }
  }

  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: "file_name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            File Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="font-medium">{row.getValue("file_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "document_type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("document_type") as string
        return <Badge variant={getDocumentTypeBadgeVariant(type) as any}>{getDocumentTypeLabel(type)}</Badge>
      },
    },
    {
      accessorKey: "file_size",
      header: "Size",
      cell: ({ row }) => {
        const size = row.getValue("file_size") as number
        return <div>{size ? formatFileSize(size) : "Unknown"}</div>
      },
    },
    {
      accessorKey: "uploaded_at",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Uploaded
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = row.getValue("uploaded_at") as string
        return <div>{new Date(date).toLocaleDateString()}</div>
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => {
        const notes = row.getValue("notes") as string
        return <div className="max-w-xs truncate">{notes || "No notes"}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const document = row.original

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
              <DropdownMenuItem onClick={() => window.open(document.file_url, "_blank")}>
                <Eye className="mr-2 h-4 w-4" />
                View Document
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const link = document.createElement("a")
                  link.href = document.file_url
                  link.download = document.file_name
                  link.click()
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(document)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Document
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

  const handleUploadDocument = (type: "signed_agreement" | "receipt" | "report") => {
    setUploadDocumentType(type)
    setIsUploadModalOpen(true)
  }

  const handleUploadSuccess = () => {
    setIsUploadModalOpen(false)
    fetchDocuments()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </h3>
            <p className="text-sm text-muted-foreground">Manage documents, receipts, and reports for this partner</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleUploadDocument("receipt")}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Receipt
            </Button>
            <Button onClick={() => handleUploadDocument("report")} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="mr-2 h-4 w-4" />
              Upload Report
            </Button>
          </div>
        </div>

        <div className="flex items-center py-4">
          <Input
            placeholder="Filter by file name..."
            value={(table.getColumn("file_name")?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn("file_name")?.setFilterValue(event.target.value)}
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
                    No documents found for this partner.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} document(s) total.
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
      <DocumentUploadModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        partnerId={partnerId}
        documentType={uploadDocumentType}
        onSuccess={handleUploadSuccess}
      />
    </Card>
  )
}
