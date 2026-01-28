"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Smartphone, Clock, AlertTriangle } from "lucide-react"
import { createIndividualForUser } from "@/app/actions/individual-actions"
import { formatPhoneForDisplay } from "@/lib/utils/phone-validation"

export function PhoneVerificationForm() {
  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [smsError, setSmsError] = useState<string | null>(null)

  const [hasInitialSent, setHasInitialSent] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile, verifyPhone, sendVerificationCode } = useAuth()

  useEffect(() => {
    // Start countdown for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  useEffect(() => {
    // Redirect if already verified
    if (profile?.is_phone_verified) {
      router.push("/supporter-dashboard")
    }
  }, [profile, router])

  // Auto-send verification code when component mounts (only once)
  useEffect(() => {
    if (profile?.phone_number && !profile?.is_phone_verified && !hasInitialSent) {
      setHasInitialSent(true)
      handleSendCode()
    }
  }, [profile, hasInitialSent])

  const handleSendCode = async () => {
    if (!profile?.phone_number) {
      toast({
        title: "Error",
        description: "No phone number found.",
        variant: "destructive",
      })
      return
    }

    setIsResending(true)
    setSmsError(null)

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: profile.phone_number,
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.details ? `${data.error}. ${data.details}` : data.error
        toast({
          title: "Failed to Send Code",
          description: errorMessage,
          variant: "destructive",
        })
        setSmsError(errorMessage)
        return
      }

      if (data.smsError) {
        // SMS failed but we have a fallback
        setSmsError(data.smsError)
        toast({
          title: "SMS Service Unavailable",
          description: "Please contact support for assistance with phone verification.",
          variant: "destructive",
        })
      } else {
        // SMS sent successfully
        setSmsError(null)
        toast({
          title: "Code Sent",
          description: "Verification code has been sent to your phone via SMS.",
        })
      }

      setCountdown(60) // 60 second countdown
      setCode("") // Clear the input
    } catch (error) {
      const errorMessage = "Failed to send verification code."
      setSmsError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await verifyPhone(code)

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Phone verified successfully, now create individual record
      if (user) {
        const result = await createIndividualForUser(user.id, {
          fullName: user.user_metadata?.full_name || profile?.full_name || "Unknown",
          email: user.email || "",
          phoneNumber: profile?.phone_number || "",
        })

        if (!result.success) {
          console.error("Failed to create individual:", result.error)
          // Continue anyway, we'll handle this in the dashboard
        }
      }

      toast({
        title: "Success",
        description: "Phone number verified successfully!",
      })

      // Redirect to supporter dashboard
      router.push("/supporter-dashboard")
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    await handleSendCode()
  }

  if (!user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we load your information</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Smartphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Verify Your Phone Number</CardTitle>
          <CardDescription>
            We've sent a verification code to{" "}
            <span className="font-medium">{formatPhoneForDisplay(profile.phone_number)}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show SMS error if there was a problem */}
          {smsError && (
            <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>SMS Service Issue:</strong>
                <div className="mt-1 text-sm">{smsError}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Please contact support if you don't receive the verification code.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                required
              />
              <p className="text-sm text-muted-foreground text-center">Enter the 6-digit code sent to your phone</p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify Phone Number"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
            <Button variant="outline" onClick={handleResend} disabled={isResending || countdown > 0} className="w-full">
              {isResending ? (
                "Sending..."
              ) : countdown > 0 ? (
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Resend in {countdown}s
                </span>
              ) : (
                "Resend Code"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
