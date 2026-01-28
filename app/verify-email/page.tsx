"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Mail, AlertCircle } from "lucide-react"

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const token = searchParams.get("token")

  useEffect(() => {
    if (token) {
      verifyEmail(token)
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsVerified(true)
        toast({
          title: "Success",
          description: "Email verified successfully! You can now sign in.",
        })
        setTimeout(() => {
          router.push("/")
        }, 3000)
      } else {
        setError(data.error || "Failed to verify email")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendEmail = async () => {
    toast({
      title: "Info",
      description: "Please contact support to resend verification email.",
    })
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p>Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-600">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You will be redirected to the login page shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleResendEmail} variant="outline" className="w-full">
              Request New Verification Email
            </Button>
            <Button onClick={() => router.push("/")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No token provided - show instructions
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address. Please check your inbox and click the link to verify
            your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Check your spam/junk folder if you don't see the email</p>
            <p>• The verification link will expire in 24 hours</p>
            <p>• Make sure to verify your phone number after email verification</p>
          </div>
          <Button onClick={handleResendEmail} variant="outline" className="w-full">
            Resend Verification Email
          </Button>
          <Button onClick={() => router.push("/")} className="w-full">
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
