"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    } else if (!isLoading && user && profile) {
      // Check if supporter needs phone verification
      if (profile.role === "supporter" && !profile.phone_verified) {
        router.push("/verify-phone")
      }
    }
  }, [user, profile, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Please wait while we load your session</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  // Check if supporter needs phone verification
  if (profile.role === "supporter" && !profile.phone_verified) {
    return null // Will redirect to verification page
  }

  return <>{children}</>
}
