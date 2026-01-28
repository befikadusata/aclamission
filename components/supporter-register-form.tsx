"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createSupporterAccount } from "@/app/actions/auth-actions"
import { validateEthiopianPhone, formatPhoneNumber } from "@/lib/utils/phone-validation"

export function SupporterRegisterForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const validatePhone = (phone: string) => {
    const validation = validateEthiopianPhone(phone)
    if (!validation.isValid) {
      setPhoneError(validation.error || "Invalid phone number format")
      return false
    }
    setPhoneError("")
    return true
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    if (!validatePhone(phoneNumber)) {
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Phone number is required for supporters.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber)
      const { error, user } = await createSupporterAccount({
        email,
        password,
        fullName,
        phoneNumber: formattedPhone,
      })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } else if (user) {
        // Send verification email via Brevo
        const emailResponse = await fetch("/api/auth/send-email-verification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            name: fullName,
            userId: user.id,
          }),
        })

        const emailData = await emailResponse.json()

        if (emailResponse.ok) {
          // Check if there was a warning in the response
          if (emailData.warning) {
            console.log("[v0] Email warning:", emailData.warning)
            toast({
              title: "Success",
              description:
                "Account created! Email verification is temporarily unavailable, but you can still access your account.",
            })
          } else {
            toast({
              title: "Success",
              description:
                "Account created! Please check your email to verify your account, then verify your phone number.",
            })
          }
          router.push("/verify-email")
        } else {
          toast({
            title: "Error",
            description: emailData.error || "Failed to process verification email. Please try again.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          After creating your account, you'll need to verify both your email address and phone number before you can
          access the platform.
        </AlertDescription>
      </Alert>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            type="text"
            autoCapitalize="words"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="name@example.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            placeholder="+251912345678 or 0912345678"
            type="tel"
            autoComplete="tel"
            required
            value={phoneNumber}
            onChange={(e) => {
              const value = e.target.value
              setPhoneNumber(value)
              if (value) {
                validatePhone(value)
              } else {
                setPhoneError("")
              }
            }}
            className={phoneError ? "border-red-500" : ""}
          />
          <p className="text-xs text-muted-foreground">
            Enter your Ethiopian phone number. We'll send a verification code to this number.
          </p>
          {phoneError && <p className="text-xs text-red-600">{phoneError}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoCapitalize="none"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              const value = e.target.value
              setPassword(value)
              if (value.length > 0 && value.length < 6) {
                setPasswordError(`Password must be at least 6 characters (${value.length}/6)`)
              } else {
                setPasswordError("")
              }
            }}
            className={passwordError ? "border-red-500" : ""}
          />
          {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoCapitalize="none"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !!phoneError || (password && password.length < 6)}>
          {isLoading ? "Creating Account..." : "Create Supporter Account"}
        </Button>
        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link href="/" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  )
}
