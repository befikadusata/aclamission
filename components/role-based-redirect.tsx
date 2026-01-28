"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export function RoleBasedRedirect() {
  const { user, profile, isLoading } = useAuth()
  const router = useRouter()
  const redirectedRef = useRef(false)

  useEffect(() => {
    // Prevent multiple redirects
    if (redirectedRef.current || isLoading) return

    console.log("RoleBasedRedirect - User:", user?.email, "Profile:", profile?.role, "Loading:", isLoading)

    if (!isLoading && user && profile) {
      redirectedRef.current = true

      if (profile.role === "admin" || profile.role === "super_admin") {
        console.log("Redirecting admin to dashboard")
        router.push("/dashboard")
      } else if (profile.role === "supporter") {
        if (!profile.is_phone_verified) {
          console.log("Redirecting supporter to phone verification")
          router.push("/verify-phone")
        } else {
          console.log("Redirecting supporter to supporter dashboard")
          router.push("/supporter-dashboard")
        }
      }
    } else if (!isLoading && !user) {
      redirectedRef.current = true
      console.log("Redirecting to home - no user")
      router.push("/")
    }
  }, [user, profile, isLoading, router])

  // Reset redirect flag when user changes
  useEffect(() => {
    redirectedRef.current = false
  }, [user?.id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return null
}
