"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserAccountsTable } from "@/components/user-accounts-table"
import { CreateUserModal } from "@/components/create-user-modal"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { Shield, Users, UserCheck, AlertCircle, PlusCircle, User, UserPlus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface UserStats {
  totalUsers: number
  adminUsers: number
  supporterUsers: number
  verifiedUsers: number
  unverifiedUsers: number
}

interface UserWithAuth {
  id: string
  email: string
  auth_email: string | null
  full_name: string
  role: string
  user_type: string | null
  is_email_verified: boolean
  created_at: string
}

interface AccountCreationResult {
  email: string
  success: boolean
  error?: string
  password?: string
}

export default function UserAccountsPage() {
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [generateAccountsDialogOpen, setGenerateAccountsDialogOpen] = useState(false)
  const [generatingAccounts, setGeneratingAccounts] = useState(false)
  const [accountCreationResults, setAccountCreationResults] = useState<{
    processed: number
    created: number
    errors: number
    skipped: number
    results: AccountCreationResult[]
  } | null>(null)
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    adminUsers: 0,
    supporterUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
  })
  const [data, setData] = useState<UserWithAuth[]>([])
  const { toast } = useToast()

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

  useEffect(() => {
    fetchUserStats()

    // Set up real-time subscription for stats updates
    const channel = supabase
      .channel(`user_stats_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchUserStats()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const fetchUserStats = async () => {
    try {
      setLoading(true)

      // Fetch auth users from the API endpoint
      const authResponse = await fetch("/api/admin/get-auth-users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!authResponse.ok) {
        throw new Error("Failed to fetch auth users")
      }

      const { authUsers } = await authResponse.json()

      // Fetch all profiles directly from the profiles table
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

      console.log("Fetched profiles for stats:", mergedUsers)

      // Set the data state for the recent users section
      setData(mergedUsers || [])

      // Log all unique role values found in the database
      const uniqueRoles = [...new Set(profiles?.map((p) => p.role) || [])]
      console.log("Unique roles found in database:", uniqueRoles)

      // Calculate stats from profiles data with more flexible role matching
      const totalUsers = profiles?.length || 0
      const adminUsers = profiles?.filter(isUserAdmin).length || 0
      const supporterUsers = profiles?.filter(isUserSupporter).length || 0
      const verifiedUsers = profiles?.filter((p) => p.is_email_verified === true).length || 0
      const unverifiedUsers = totalUsers - verifiedUsers

      setStats({
        totalUsers,
        adminUsers,
        supporterUsers,
        verifiedUsers,
        unverifiedUsers,
      })

      console.log("Calculated stats:", {
        totalUsers,
        adminUsers,
        supporterUsers,
        verifiedUsers,
        unverifiedUsers,
      })

      // Log role distribution for debugging
      const roleDistribution = profiles?.reduce(
        (acc, user) => {
          const role = user.role?.toLowerCase() || "unknown"
          acc[role] = (acc[role] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      console.log("Role distribution in stats:", roleDistribution)

      // Log each supporter found for debugging
      const supporterUsers2 = profiles?.filter(isUserSupporter) || []
      console.log(
        "Supporter users found:",
        supporterUsers2.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          user_type: u.user_type,
        })),
      )
    } catch (error: any) {
      console.error("Error fetching user stats:", error)
      toast({
        title: "Error",
        description: "Failed to fetch user statistics",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setCreateModalOpen(true)
  }

  const handleUserCreated = () => {
    fetchUserStats()
    toast({
      title: "Success",
      description: "User created successfully",
    })
  }

  const handleGenerateAccounts = async () => {
    try {
      setGeneratingAccounts(true)

      const response = await fetch("/api/admin/create-all-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to generate accounts")
      }

      const data = await response.json()

      if (data.success) {
        setAccountCreationResults(data)
        toast({
          title: "Success",
          description: `Created ${data.created} accounts out of ${data.processed} individuals`,
        })
      } else {
        throw new Error(data.error || "Failed to generate accounts")
      }
    } catch (error: any) {
      console.error("Error generating accounts:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate accounts",
        variant: "destructive",
      })
    } finally {
      setGeneratingAccounts(false)
      fetchUserStats() // Refresh user stats
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">User Accounts</h1>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Accounts</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions from the profiles table</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGenerateAccountsDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Generate Supporter Accounts
          </Button>
          <Button onClick={handleCreateUser}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by email..."
              onChange={(e) => {
                const value = e.target.value.toLowerCase()
                if (value) {
                  const filtered = data.filter(
                    (user) =>
                      (user.email && user.email.toLowerCase().includes(value)) ||
                      (user.auth_email && user.auth_email.toLowerCase().includes(value)),
                  )
                  setData(filtered)
                } else {
                  fetchUserStats() // Reset to all users
                }
              }}
              className="w-full"
            />
          </div>
          <Button variant="outline" onClick={fetchUserStats}>
            Reset
          </Button>
        </div>
      </div>

      {/* Account Creation Results */}
      {accountCreationResults && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Account Generation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <p className="text-sm text-gray-500">Processed</p>
                  <p className="text-2xl font-bold">{accountCreationResults.processed}</p>
                </div>
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <p className="text-sm text-green-500">Created</p>
                  <p className="text-2xl font-bold text-green-600">{accountCreationResults.created}</p>
                </div>
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <p className="text-sm text-amber-500">Skipped</p>
                  <p className="text-2xl font-bold text-amber-600">{accountCreationResults.skipped || 0}</p>
                </div>
                <div className="bg-white p-4 rounded-md shadow-sm">
                  <p className="text-sm text-red-500">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{accountCreationResults.errors}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm max-h-60 overflow-y-auto">
                <p className="font-medium mb-2">Created Accounts (Password: 123456)</p>
                <div className="space-y-1">
                  {accountCreationResults.results
                    .filter((r) => r.success)
                    .map((result, i) => (
                      <div key={i} className="text-sm py-1 border-b">
                        <span className="font-medium">{result.email}</span>
                      </div>
                    ))}
                </div>
              </div>

              {accountCreationResults.errors > 0 && (
                <div className="bg-white p-4 rounded-md shadow-sm max-h-60 overflow-y-auto">
                  <p className="font-medium mb-2 text-red-600">Errors</p>
                  <div className="space-y-1">
                    {accountCreationResults.results
                      .filter((r) => !r.success)
                      .map((result, i) => (
                        <div key={i} className="text-sm py-1 border-b">
                          <span className="font-medium">{result.email}</span>
                          <span className="text-red-500 ml-2">- {result.error}</span>
                          {result.error === "Invalid email format" && (
                            <span className="block text-xs text-gray-500 ml-2 mt-1">
                              Email address format is invalid. It should be in the format: name@example.com
                            </span>
                          )}
                          {result.error === "Email already exists" && (
                            <span className="block text-xs text-gray-500 ml-2 mt-1">
                              An account with this email already exists.
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setAccountCreationResults(null)}>
                  Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.adminUsers}</div>
            <p className="text-xs text-muted-foreground">Users with admin privileges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supporter Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.supporterUsers}</div>
            <p className="text-xs text-muted-foreground">Users with Supporter role</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verification Status</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex justify-between">
              <div>
                <div className="text-xl font-bold text-green-600">{stats.verifiedUsers}</div>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">{stats.unverifiedUsers}</div>
                <p className="text-xs text-muted-foreground">Unverified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Recent Users Section with Emails */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-4">Loading recent users...</div>
            ) : (
              <>
                {stats.totalUsers > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data?.slice(0, 6).map((user) => (
                      <div key={user.id} className="flex items-center space-x-4 p-3 border rounded-md">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.full_name || "Unnamed User"}</p>
                          <p className="text-sm text-primary truncate font-medium">
                            {user.auth_email || user.email || "No Email"}
                          </p>
                          {user.auth_email && user.email && user.auth_email !== user.email && (
                            <p className="text-xs text-muted-foreground truncate">Profile: {user.email}</p>
                          )}
                          <div className="flex items-center mt-1">
                            <Badge
                              variant={user.user_type === "supporter" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {user.user_type || user.role || "No Role"}
                            </Badge>
                            {user.is_email_verified ? (
                              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 text-xs">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 text-xs">
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">No users found</div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">All Users ({stats.totalUsers})</TabsTrigger>
          <TabsTrigger value="admin">Admins ({stats.adminUsers})</TabsTrigger>
          <TabsTrigger value="supporter">Supporters ({stats.supporterUsers})</TabsTrigger>
          <TabsTrigger value="unverified">Unverified ({stats.unverifiedUsers})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <UserAccountsTable filter="all" onUserUpdated={fetchUserStats} />
        </TabsContent>
        <TabsContent value="admin">
          <UserAccountsTable filter="admin" onUserUpdated={fetchUserStats} />
        </TabsContent>
        <TabsContent value="supporter">
          <UserAccountsTable filter="supporter" onUserUpdated={fetchUserStats} />
        </TabsContent>
        <TabsContent value="unverified">
          <UserAccountsTable filter="unverified" onUserUpdated={fetchUserStats} />
        </TabsContent>
      </Tabs>

      <CreateUserModal open={createModalOpen} onOpenChange={setCreateModalOpen} onUserCreated={handleUserCreated} />

      {/* Generate Accounts Dialog */}
      <Dialog open={generateAccountsDialogOpen} onOpenChange={setGenerateAccountsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Supporter Accounts</DialogTitle>
            <DialogDescription>
              This will create user accounts for all individuals with email addresses who don't already have accounts.
              Each account will have the individual's email as username and "123456" as password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-md bg-yellow-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Important security information</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      All accounts will be created with the password "123456". Users will be required to verify their
                      email address before accessing the system. Please advise users to change their password after
                      first login.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The system will check for duplicate email addresses and skip any that already have accounts. Individuals
              with invalid email formats will also be skipped.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateAccountsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateAccounts} disabled={generatingAccounts}>
              {generatingAccounts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate Accounts</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
