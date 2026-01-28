"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
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
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Shield,
  User,
  Mail,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react"

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
import { EditUserModal } from "@/components/edit-user-modal"
import { DeleteConfirmationModal } from "@/components/delete-confirmation-modal"
import { format } from "date-fns"

interface UserProfile {
  id: string
  email: string
  auth_email: string | null
  full_name: string
  phone_number: string
  role: string
  user_type: string | null
  is_email_verified: boolean
  created_at: string
  updated_at: string
}

interface UserAccountsTableProps {
  filter: "all" | "admin" | "supporter" | "unverified"
  onUserUpdated?: () => void
}

export function UserAccountsTable({ filter, onUserUpdated }: UserAccountsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [data, setData] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const { toast } = useToast()

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user)
    setDeleteModalOpen(true)
  }

  const handleSendPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      toast({
        title: "Password Reset Sent",
        description: `Password reset email sent to ${email}`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return

    try {
      console.log("[v0] Deleting user:", selectedUser.id, selectedUser.auth_email)

      // Call the API endpoint which handles both auth and profile deletion
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          email: selectedUser.auth_email || selectedUser.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user")
      }

      console.log("[v0] Delete response:", data)

      toast({
        title: "User Deleted",
        description: `User ${selectedUser.auth_email || selectedUser.email} has been deleted successfully`,
      })

      fetchUsers()
      onUserUpdated?.()
    } catch (error: any) {
      console.error("[v0] Delete error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleExportUsers = () => {
    const csvContent = [
      ["Email", "Full Name", "Phone", "Role", "User Type", "Verified", "Created"],
      ...data.map((user) => [
        user.auth_email || user.email || "",
        user.full_name || "",
        user.phone_number || "",
        user.role || "",
        user.user_type || "",
        user.is_email_verified ? "Yes" : "No",
        user.created_at ? format(new Date(user.created_at), "yyyy-MM-dd") : "",
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `users-${filter}-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: `Exported ${data.length} users to CSV`,
    })
  }

  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: "auth_email",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium text-primary">{row.getValue("auth_email") || row.getValue("email") || "N/A"}</div>
      ),
    },
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => <div>{row.getValue("full_name") || "N/A"}</div>,
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      cell: ({ row }) => <div>{row.getValue("phone_number") || "N/A"}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string
        const isAdmin = role?.toLowerCase() === "admin"
        const isSupporter = role?.toLowerCase()?.includes("support")

        return (
          <Badge variant={isAdmin ? "default" : "secondary"}>
            {isAdmin ? <Shield className="mr-1 h-3 w-3" /> : <User className="mr-1 h-3 w-3" />}
            {role || "Unknown"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "user_type",
      header: "User Type",
      cell: ({ row }) => {
        const userType = row.getValue("user_type") as string
        return (
          <Badge variant="outline" className={userType?.toLowerCase() === "supporter" ? "bg-blue-100" : ""}>
            {userType || "Not specified"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "is_email_verified",
      header: "Verified",
      cell: ({ row }) => {
        const isVerified = row.getValue("is_email_verified") as boolean
        return (
          <div className="flex items-center">
            {isVerified ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Created
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at")
        if (!dateValue) return <div>N/A</div>
        try {
          const date = new Date(dateValue as string)
          return <div>{format(date, "MMM d, yyyy")}</div>
        } catch (e) {
          return <div>Invalid Date</div>
        }
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original
        const userEmail = user.auth_email || user.email

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
              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {userEmail && (
                <DropdownMenuItem onClick={() => handleSendPasswordReset(userEmail)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Password Reset
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
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
    fetchUsers()

    const channelName = `user_accounts_table_${filter}_${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchUsers()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [filter])

  // Helper function to determine if a user is a supporter
  const isUserSupporter = (user: any) => {
    // First check the user_type field
    if (user.user_type && user.user_type.toLowerCase() === "supporter") {
      return true
    }

    // Fall back to role check if user_type is not available
    if (user.role) {
      const role = user.role.toLowerCase()
      return role.includes("support") || role === "supporter"
    }

    return false
  }

  // Helper function to determine if a user is an admin
  const isUserAdmin = (user: any) => {
    if (!user.role) return false

    const role = user.role.toLowerCase()
    return role === "admin"
  }

  async function fetchUsers() {
    try {
      setLoading(true)

      // Create a server-side API endpoint to fetch auth users
      const response = await fetch("/api/admin/get-auth-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch auth users")
      }

      const { authUsers } = await response.json()

      // Fetch profiles from the profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching profiles:", error)
        throw error
      }

      // Merge auth users with profiles
      const mergedUsers = profiles?.map((profile) => {
        const authUser = authUsers?.find((au: any) => au.id === profile.id)
        return {
          ...profile,
          auth_email: authUser?.email || null,
        }
      })

      console.log("Fetched profiles with auth emails:", mergedUsers)

      // Log all unique role values found in the database
      const uniqueRoles = [...new Set(mergedUsers?.map((p) => p.role) || [])]
      console.log("Unique roles found in database:", uniqueRoles)

      let filteredData = mergedUsers || []

      // Apply filters based on the selected tab with more flexible matching
      if (filter === "admin") {
        filteredData = filteredData.filter(isUserAdmin)
        console.log(`Found ${filteredData.length} admin users`)
      } else if (filter === "supporter") {
        filteredData = filteredData.filter(isUserSupporter)
        console.log(`Found ${filteredData.length} supporter users`)
      } else if (filter === "unverified") {
        filteredData = filteredData.filter((user) => user.is_email_verified !== true)
        console.log(`Found ${filteredData.length} unverified users`)
      }

      // Log detailed role information for debugging
      const roleDistribution = mergedUsers?.reduce(
        (acc, user) => {
          const role = user.role?.toLowerCase() || "unknown"
          acc[role] = (acc[role] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      console.log("Role distribution:", roleDistribution)

      // Log each supporter found for debugging
      if (filter === "supporter") {
        console.log(
          "Supporter users found:",
          filteredData.map((u) => ({
            id: u.id,
            email: u.email,
            auth_email: u.auth_email,
            role: u.role,
            user_type: u.user_type,
          })),
        )
      }

      setData(filteredData)
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
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
            <div className="text-muted-foreground">Loading users from profiles table...</div>
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
            <Input
              placeholder="Filter by email..."
              value={(table.getColumn("auth_email")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("auth_email")?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExportUsers}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
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
                      No users found for filter: {filter}
                      <br />
                      <small className="text-muted-foreground">No matching users in the profiles table</small>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} user(s) found in profiles table.
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

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onSuccess={() => {
          fetchUsers()
          onUserUpdated?.()
        }}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete User"
        description="This will permanently delete the user account and all associated data. This action cannot be undone."
        itemName={selectedUser?.auth_email || selectedUser?.email || ""}
        deleteAction={handleDeleteConfirm}
      />
    </>
  )
}
