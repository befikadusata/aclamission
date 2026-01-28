"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { FirstPledgeForm } from "@/components/first-pledge-form"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function FirstPledgePage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [individual, setIndividual] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    // If user is not authenticated, redirect to home
    if (!user || !profile) {
      router.push("/")
      return
    }

    // If user is not a supporter, redirect to dashboard
    if (profile.role !== "supporter") {
      router.push("/dashboard")
      return
    }

    // If user is a supporter but phone not verified, redirect to verification
    if (profile.role === "supporter" && !profile.is_phone_verified) {
      router.push("/verify-phone")
      return
    }

    // Get individual ID from user metadata
    const individualId = user.user_metadata?.individual_id

    // Debug info - wrap in async function to avoid direct state updates in effect
    const updateDebugInfo = async () => {
      setDebugInfo({
        userId: user.id,
        email: user.email,
        individualId: individualId,
        role: profile.role,
        phoneVerified: profile.is_phone_verified,
      })
    }

    updateDebugInfo()

    if (!individualId) {
      // Wrap state updates in async function to avoid direct updates in effect
      const updateState = async () => {
        setError("No individual record found. We need to create one for you.")
        setLoading(false)
      }
      updateState()
      return
    }

    // Fetch individual data
    const fetchIndividual = async () => {
      try {
        // First check if the individual exists
        const {
          data: checkData,
          error: checkError,
          count,
        } = await supabase.from("individuals").select("*", { count: "exact" }).eq("id", individualId)

        if (checkError) {
          console.error("Error checking individual:", checkError)
          setError("Could not check your profile information. Please try again later.")
          setLoading(false)
          return
        }

        if (!count || count === 0) {
          setError(`No individual record found with ID: ${individualId}. We need to create one for you.`)
          setLoading(false)
          return
        }

        // If we have exactly one record, use it
        if (count === 1 && checkData && checkData.length === 1) {
          setIndividual(checkData[0])
          setLoading(false)
          return
        }

        // If we have multiple records (shouldn't happen), use the first one
        if (count > 1 && checkData && checkData.length > 0) {
          console.warn(`Found ${count} individuals with ID ${individualId}, using the first one`)
          setIndividual(checkData[0])
          setLoading(false)
          return
        }

        setError("Could not find your profile information. Please try again later.")
        setLoading(false)
      } catch (err) {
        console.error("Unexpected error:", err)
        setError("An unexpected error occurred. Please try again later.")
        setLoading(false)
      }
    }

    fetchIndividual()
  }, [user, profile, router])

  // Function to create an individual record if needed
  const createIndividual = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Create a new individual record using the correct column names
      const { data: newIndividual, error: createError } = await supabase
        .from("individuals")
        .insert([
          {
            name: user.user_metadata?.full_name || profile?.full_name || "Unknown",
            email: user.email,
            phone_number: profile?.phone_number || "",
            user_id: user.id, // Link to the auth user
          },
        ])
        .select()

      if (createError) {
        console.error("Error creating individual:", createError)
        setError("Could not create your profile. Please try again later.")
        setLoading(false)
        return
      }

      if (!newIndividual || newIndividual.length === 0) {
        setError("Failed to create your profile. Please try again later.")
        setLoading(false)
        return
      }

      // Update user metadata with the new individual ID
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          individual_id: newIndividual[0].id,
        },
      })

      if (updateError) {
        console.error("Error updating user metadata:", updateError)
        setError("Could not link your profile. Please try again later.")
        setLoading(false)
        return
      }

      // Set the individual and clear errors
      setIndividual(newIndividual[0])
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error("Unexpected error creating individual:", err)
      setError("An unexpected error occurred. Please try again later.")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !individual) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Profile Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-xs overflow-auto">
                <p className="font-bold mb-2">Debug Information:</p>
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Home
            </Button>
            <Button onClick={createIndividual}>Create Profile</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to ACLA Missions!</CardTitle>
          <CardDescription>
            Thank you for creating your account. Let's set up your first pledge to support our missionaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {individual ? (
            <FirstPledgeForm individual={individual} onSuccess={() => router.push("/supporter-dashboard")} />
          ) : (
            <div className="text-center p-4">
              <p className="text-red-500">Unable to load your profile information. Please try again later.</p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
