"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CreateTestAdmin() {
  const [email, setEmail] = useState("admin@acla.org")
  const [password, setPassword] = useState("admin123")
  const [fullName, setFullName] = useState("ACLA Administrator")
  const [isLoading, setIsLoading] = useState(false)
  const { signUp } = useAuth()
  const { toast } = useToast()

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await signUp(email, password, fullName)

      if (error) {
        toast({
          title: "Error creating admin",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Admin created successfully",
          description: "Please check your email to confirm your account, then you can log in.",
        })
      }
    } catch (err) {
      toast({
        title: "Unexpected error",
        description: "Failed to create admin account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Test Admin</CardTitle>
        <CardDescription>Create an admin account for testing purposes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email</Label>
            <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-name">Full Name</Label>
            <Input
              id="admin-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Admin Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
