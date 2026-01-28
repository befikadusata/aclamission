"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createAccountsForExistingPledges } from "@/app/actions/supporter-account-actions"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, AlertCircle, Mail, UserPlus } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function CreateSupporterAccountsPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const handleCreateAccounts = async () => {
    setIsProcessing(true)
    try {
      const result = await createAccountsForExistingPledges()
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Supporter Accounts</h1>
          <p className="text-muted-foreground">
            Create user accounts for individuals with pledges who don't have accounts yet
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Account Creation</CardTitle>
            <CardDescription>
              This will create user accounts for all individuals who have pledges but don't have accounts yet. Each
              individual must have a valid email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleCreateAccounts} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? "Processing..." : "Create Accounts"}
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
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Detailed Results</h3>
                  <div className="max-h-64 overflow-y-auto border rounded">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.results.map((result: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm">{result.email}</td>
                            <td className="px-4 py-2">
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
                            </td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">
                              {result.error || (result.success ? "Account created successfully" : "")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
