"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Mail, UserPlus, Key, ShieldAlert } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

export default function CreateAllAccountsPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const handleCreateAccounts = async () => {
    // Show confirmation dialog
    if (
      !confirm(
        "This will create accounts for ALL individuals with email addresses using a fixed password of '123456'. Are you sure you want to continue?",
      )
    ) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch("/api/admin/create-all-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      setResults(result)

      if (result.success) {
        toast({
          title: "Success",
          description: `Created ${result.created} accounts out of ${result.processed} eligible individuals`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create accounts",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter results based on search term
  const filteredResults =
    results?.results?.filter((result: any) => result.email.toLowerCase().includes(searchTerm.toLowerCase())) || []

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create All User Accounts</h1>
          <p className="text-muted-foreground">Create user accounts for ALL individuals with email addresses</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Account Creation</CardTitle>
            <CardDescription>
              This will create user accounts for ALL individuals who have email addresses but don't have accounts yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="warning">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                All accounts will be created with the password <strong>123456</strong>. Users should change their
                password after first login.
              </AlertDescription>
            </Alert>

            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Email Verification Required</AlertTitle>
              <AlertDescription>
                All created accounts will receive a verification email. Users must verify their email before accessing
                the system.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <span>
                Accounts will be created with the <Badge variant="outline">Supporter</Badge> role and limited
                permissions
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <span>
                Default password: <code className="bg-muted px-1 py-0.5 rounded">123456</code>
              </span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleCreateAccounts} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? "Processing..." : "Create All Accounts"}
            </Button>
          </CardFooter>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Processing Results</CardTitle>
              <CardDescription>Summary of account creation process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="text-sm font-medium text-muted-foreground">Processed</div>
                  <div className="text-2xl font-bold">{results.processed}</div>
                  <div className="text-xs text-muted-foreground">Total eligible individuals</div>
                </div>

                <div className="p-4 border rounded-lg bg-green-50">
                  <div className="text-sm font-medium text-green-600">Created</div>
                  <div className="text-2xl font-bold text-green-700">{results.created}</div>
                  <div className="text-xs text-green-600">Accounts successfully created</div>
                </div>

                <div className="p-4 border rounded-lg bg-red-50">
                  <div className="text-sm font-medium text-red-600">Errors</div>
                  <div className="text-2xl font-bold text-red-700">{results.errors || 0}</div>
                  <div className="text-xs text-red-600">Failed account creations</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Success Rate</span>
                  <span className="font-medium">
                    {results.processed > 0 ? Math.round((results.created / results.processed) * 100) : 0}%
                  </span>
                </div>
                <Progress
                  value={results.processed > 0 ? (results.created / results.processed) * 100 : 0}
                  className="h-2"
                />
              </div>

              {results.results && results.results.length > 0 && (
                <Tabs defaultValue="all">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList>
                      <TabsTrigger value="all">All Results ({results.results.length})</TabsTrigger>
                      <TabsTrigger value="success">Success ({results.created})</TabsTrigger>
                      <TabsTrigger value="failed">Failed ({results.errors || 0})</TabsTrigger>
                    </TabsList>

                    <div className="relative w-64">
                      <Input
                        placeholder="Search by email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                      <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <TabsContent value="all" className="mt-0">
                    <div className="border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Password</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredResults.length > 0 ? (
                            filteredResults.map((result: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{result.email}</TableCell>
                                <TableCell>
                                  {result.success ? (
                                    <div className="flex items-center">
                                      <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                      <span className="text-sm text-green-600">Success</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center">
                                      <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                                      <span className="text-sm text-red-600">Failed</span>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {result.success ? (
                                    <code className="bg-muted px-1 py-0.5 rounded text-sm">123456</code>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {result.error || (result.success ? "Account created successfully" : "")}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                {searchTerm ? "No results match your search" : "No results available"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="success" className="mt-0">
                    <div className="border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Password</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredResults.filter((r: any) => r.success).length > 0 ? (
                            filteredResults
                              .filter((result: any) => result.success)
                              .map((result: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{result.email}</TableCell>
                                  <TableCell>
                                    <code className="bg-muted px-1 py-0.5 rounded text-sm">123456</code>
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                {searchTerm ? "No successful results match your search" : "No successful results"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="failed" className="mt-0">
                    <div className="border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredResults.filter((r: any) => !r.success).length > 0 ? (
                            filteredResults
                              .filter((result: any) => !result.success)
                              .map((result: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{result.email}</TableCell>
                                  <TableCell className="text-sm text-red-600">{result.error}</TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                                {searchTerm ? "No failed results match your search" : "No failed results"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
