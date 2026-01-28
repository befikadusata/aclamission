"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const { error } = await signIn(email.trim(), password)

      if (error) {
        console.error("Login error:", error)

        let errorMessage = error.message || "An error occurred during login"
        let errorDescription = ""

        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "Login Failed"
          errorDescription = "Invalid email or password. Please check your credentials and try again."
        } else if (error.message?.includes("Email not confirmed")) {
          errorMessage = "Email Not Confirmed"
          errorDescription = "Please check your email and click the confirmation link before signing in."
        } else if (error.message?.includes("Too many requests")) {
          errorMessage = "Too Many Attempts"
          errorDescription = "Too many login attempts. Please wait a moment and try again."
        } else if (error.message?.includes("User not found")) {
          errorMessage = "Account Not Found"
          errorDescription =
            "No account found with this email address. Please check your email or register for a new account."
        }

        toast({
          title: errorMessage,
          description: errorDescription,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Login successful",
        description: "Welcome back!",
      })

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Unexpected login error:", err)
      toast({
        title: "Login error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-gray-900">Login</h3>
        <p className="text-gray-600">Enter your credentials to access your account</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <div className="space-y-3 text-center text-sm">
        <div>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
            Register
          </Link>
        </div>

        <div className="pt-3 border-t border-gray-200">
          New supporter?{" "}
          <Link href="/register-supporter" className="text-blue-600 hover:text-blue-500 font-medium">
            Create Supporter Account
          </Link>
        </div>
      </div>
    </div>
  )
}
