"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface InvalidEmail {
  id: string
  name: string
  email: string
}

interface FixResult {
  id: string
  original_email: string
  fixed_email: string | null
  status: "FIXED" | "NEEDS_MANUAL_FIX"
}

export default function FixInvalidEmailsPage() {
  const [invalidEmails, setInvalidEmails] = useState<InvalidEmail[]>([])
  const [fixResults, setFixResults] = useState<FixResult[]>([])
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchInvalidEmails()
  }, [])

  async function fetchInvalidEmails() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/fix-invalid-emails")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch invalid emails")
      }

      const data = await response.json()
      setInvalidEmails(data.invalidEmails || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  async function fixInvalidEmails() {
    setFixing(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/fix-invalid-emails", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fix invalid emails")
      }

      const data = await response.json()
      setFixResults(data.fixed || [])
      setInvalidEmails(data.remaining || [])

      const fixedCount = data.fixed?.filter((r: FixResult) => r.status === "FIXED").length || 0
      setSuccess(
        `Successfully fixed ${fixedCount} email(s). ${data.remaining?.length || 0} invalid email(s) remaining.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fix Invalid Emails</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/user-accounts")}>
            Back to User Accounts
          </Button>
          <Button variant="outline" onClick={fetchInvalidEmails} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Invalid Email Addresses</CardTitle>
          <CardDescription>
            These email addresses have invalid formats and need to be fixed before creating user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          ) : invalidEmails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {fixResults.length > 0 ? "All invalid emails have been fixed!" : "No invalid emails found."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Invalid Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invalidEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>{email.name}</TableCell>
                    <TableCell className="font-mono text-red-500">{email.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {invalidEmails.length} invalid email{invalidEmails.length !== 1 ? "s" : ""} found
          </div>
          <Button onClick={fixInvalidEmails} disabled={fixing || invalidEmails.length === 0}>
            {fixing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Fixing...
              </>
            ) : (
              "Auto-Fix Invalid Emails"
            )}
          </Button>
        </CardFooter>
      </Card>

      {fixResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fix Results</CardTitle>
            <CardDescription>Results of the automatic email fixing process.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Original Email</TableHead>
                  <TableHead>Fixed Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-mono text-red-500">{result.original_email}</TableCell>
                    <TableCell className="font-mono text-green-600">{result.fixed_email || "—"}</TableCell>
                    <TableCell>
                      {result.status === "FIXED" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Fixed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Needs Manual Fix
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
