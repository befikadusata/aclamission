"use client"

import type React from "react"

import { createContext, useState, useEffect, useContext, useCallback, useRef } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase, testSupabaseConnection } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  full_name: string | null
  role: "admin" | "user" | "supporter"
  phone_number: string | null
  is_phone_verified: boolean
  is_email_verified: boolean
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: any }>
  sendVerificationCode: (phoneNumber: string) => Promise<{ error: any }>
  verifyPhone: (code: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
  getIndividualId: () => string | null
  canAccessDashboard: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()

  // Use refs to prevent infinite loops
  const initializingRef = useRef(false)
  const cleanupRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear all auth state
  const clearAuthState = useCallback(() => {
    console.log("Clearing auth state")
    setUser(null)
    setSession(null)
    setProfile(null)
  }, [])

  // Set loading timeout to prevent infinite loading
  const setLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }

    loadingTimeoutRef.current = setTimeout(() => {
      console.log("Loading timeout reached, setting loading to false")
      setIsLoading(false)
    }, 8000) // Increased to 8 seconds
  }, [])

  // Clear loading timeout
  const clearLoadingTimeout = useCallback(() => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
      loadingTimeoutRef.current = null
    }
  }, [])

  // Force cleanup of any existing sessions
  const forceCleanup = useCallback(async () => {
    if (cleanupRef.current) return
    cleanupRef.current = true

    try {
      console.log("Performing force cleanup...")

      // Clear local storage items that might interfere
      if (typeof window !== "undefined") {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((key) => {
          console.log(`Removing localStorage key: ${key}`)
          localStorage.removeItem(key)
        })
      }

      // Clear our local state first
      clearAuthState()

      // Sign out from Supabase (this clears server-side session)
      try {
        await supabase.auth.signOut()
      } catch (signOutErr) {
        console.error("Error during signOut:", signOutErr)
        // Continue even if signOut fails
      }

      console.log("Force cleanup completed")
    } catch (err) {
      console.error("Error during force cleanup:", err)
    } finally {
      cleanupRef.current = false
    }
  }, [clearAuthState])

  // Fetch profile without timeout - let it complete naturally
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log("Fetching profile for user:", userId)

      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()

      if (error) {
        console.error("Error fetching profile:", error)
        return null
      }

      if (!data) {
        console.log("No profile found for user:", userId)
        return null
      }

      console.log("Profile fetched successfully:", data.full_name, "Role:", data.role)
      return data as Profile
    } catch (err) {
      console.error("Error fetching profile:", err)
      return null
    }
  }, [])

  // Initialize auth state - ONLY RUN ONCE
  useEffect(() => {
    if (initializingRef.current) return
    initializingRef.current = true

    let mounted = true
    let authSubscription: any = null

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...")
        setLoadingTimeout() // Set timeout for initialization

        // Test connection first
        try {
          await testSupabaseConnection()
        } catch (connErr) {
          console.error("Connection test failed:", connErr)
          // Continue anyway
        }

        // Try to get current session
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession()

          if (!mounted) return

          if (error) {
            console.error("Error getting session:", error)

            // Handle refresh token errors specifically
            if (
              error.message?.includes("refresh_token_not_found") ||
              error.message?.includes("invalid_grant") ||
              error.message?.includes("Invalid Refresh Token")
            ) {
              console.log("Refresh token error detected, cleaning up...")
              await forceCleanup()
            } else {
              clearAuthState()
            }
          } else if (session?.user) {
            console.log("Found existing session for:", session.user.email)

            setSession(session)
            setUser(session.user)

            // Fetch profile - don't block on this
            fetchProfile(session.user.id)
              .then((userProfile) => {
                if (mounted && userProfile) {
                  setProfile(userProfile)
                }
              })
              .catch((profileErr) => {
                console.error("Error fetching profile during init:", profileErr)
                // Continue without profile
              })
          } else {
            console.log("No existing session found")
            clearAuthState()
          }
        } catch (sessionErr) {
          console.error("Session fetch error:", sessionErr)

          // If there's a token error, clean up
          if (
            sessionErr instanceof Error &&
            (sessionErr.message?.includes("refresh_token_not_found") ||
              sessionErr.message?.includes("invalid_grant") ||
              sessionErr.message?.includes("Invalid Refresh Token"))
          ) {
            console.log("Refresh token error in catch block, cleaning up...")
            await forceCleanup()
          } else {
            clearAuthState()
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err)
        if (mounted) {
          clearAuthState()
        }
      } finally {
        if (mounted) {
          clearLoadingTimeout()
          setIsLoading(false)
          console.log("Auth initialization completed")
        }
      }
    }

    // Set up auth state listener
    const setupAuthListener = () => {
      try {
        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return

          console.log("Auth state changed:", event, session?.user?.email || "no user")

          try {
            switch (event) {
              case "SIGNED_IN":
                if (session?.user) {
                  console.log("User signed in:", session.user.email)
                  setSession(session)
                  setUser(session.user)

                  // Fetch profile for signed in user - don't block
                  fetchProfile(session.user.id)
                    .then((userProfile) => {
                      if (mounted && userProfile) {
                        setProfile(userProfile)
                        console.log("Profile set for signed in user:", userProfile.role)
                      }
                    })
                    .catch((profileErr) => {
                      console.error("Error fetching profile on sign in:", profileErr)
                      // Continue without profile
                    })
                }
                break

              case "SIGNED_OUT":
                console.log("User signed out")
                clearAuthState()
                break

              case "TOKEN_REFRESHED":
                if (session?.user) {
                  console.log("Token refreshed for:", session.user.email)
                  setSession(session)
                  setUser(session.user)
                  // Keep existing profile, don't refetch
                }
                break

              default:
                // Handle other events without causing loops
                if (session?.user && !user) {
                  setSession(session)
                  setUser(session.user)

                  if (!profile) {
                    fetchProfile(session.user.id)
                      .then((userProfile) => {
                        if (mounted && userProfile) {
                          setProfile(userProfile)
                        }
                      })
                      .catch((profileErr) => {
                        console.error("Error fetching profile in default case:", profileErr)
                      })
                  }
                } else if (!session?.user && user) {
                  clearAuthState()
                }
            }
          } catch (err) {
            console.error("Error handling auth state change:", err)
          } finally {
            // Always ensure loading is false after auth state change
            setIsLoading(false)
          }
        })
      } catch (listenerErr) {
        console.error("Error setting up auth listener:", listenerErr)
        setIsLoading(false)
      }
    }

    // Initialize
    initializeAuth()
    setupAuthListener()

    // Cleanup
    return () => {
      mounted = false
      initializingRef.current = false
      clearLoadingTimeout()
      if (authSubscription) {
        try {
          authSubscription.data?.subscription?.unsubscribe()
        } catch (err) {
          console.error("Error unsubscribing from auth:", err)
        }
      }
    }
  }, []) // Empty dependency array - only run once

  const signIn = async (email: string, password: string) => {
    try {
      console.log("Starting sign in process for:", email)
      setIsLoading(true)
      setLoadingTimeout()

      if (!email || !password) {
        clearLoadingTimeout()
        setIsLoading(false)
        return {
          error: {
            message: "Email and password are required",
            name: "ValidationError",
          },
        }
      }

      // Force cleanup any existing sessions first
      await forceCleanup()

      // Wait a bit for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 300))

      console.log("Attempting sign in after cleanup...")

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (error) {
        console.error("Sign in error:", error)
        clearLoadingTimeout()
        setIsLoading(false)

        let errorMessage = error.message
        if (error.message?.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again."
        } else if (error.message?.includes("Email not confirmed")) {
          errorMessage = "Please check your email and click the confirmation link before signing in."
        } else if (error.message?.includes("Too many requests")) {
          errorMessage = "Too many login attempts. Please wait a moment and try again."
        }

        return { error: { ...error, message: errorMessage } }
      }

      if (!data.user) {
        clearLoadingTimeout()
        setIsLoading(false)
        return {
          error: {
            message: "Sign in failed. Please try again.",
            name: "SignInError",
          },
        }
      }

      console.log("Sign in successful for:", data.user.email)
      // Don't set loading to false here - let the auth listener handle it
      return { error: null }
    } catch (err) {
      console.error("Unexpected sign in error:", err)
      clearLoadingTimeout()
      setIsLoading(false)
      return {
        error: {
          message: "A network error occurred. Please check your connection and try again.",
          name: "NetworkError",
        },
      }
    }
  }

  const signOut = async () => {
    try {
      console.log("Starting sign out process")
      setIsLoading(true)

      // Clear state first
      clearAuthState()

      // Sign out from Supabase
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error("Sign out error:", error)
        }
      } catch (signOutErr) {
        console.error("Error during sign out:", signOutErr)
        // Continue even if sign out fails
      }

      // Navigate to home
      router.push("/")
    } catch (err) {
      console.error("Unexpected sign out error:", err)
      clearAuthState()
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { error }
      }

      if (!data.user) {
        return { error: { message: "Failed to create user account" } }
      }

      // Check if profile already exists
      const existingProfile = await fetchProfile(data.user.id)

      if (!existingProfile) {
        const { error: profileError } = await supabase.auth.updateUser({
          data: { role: "admin" },
        })

        if (profileError) {
          console.error("Error updating user metadata:", profileError)
        }

        const { error: profileInsertError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            full_name: fullName,
            role: "admin",
            is_phone_verified: true,
            is_email_verified: true,
          },
          {
            onConflict: "id",
          },
        )

        if (profileInsertError) {
          console.error("Error creating profile:", profileInsertError)
          return { error: { message: "Failed to create user profile" } }
        }
      }

      return { error: null }
    } catch (err) {
      console.error("Unexpected signup error:", err)
      return {
        error: {
          message: "An unexpected error occurred during registration.",
          name: "SignUpError",
        },
      }
    }
  }

  const sendVerificationCode = async (phoneNumber: string) => {
    if (!user) {
      return { error: { message: "User not authenticated" } }
    }

    try {
      const response = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: { message: data.error } }
      }

      return { error: null }
    } catch (err) {
      return { error: { message: "Failed to send verification code" } }
    }
  }

  const verifyPhone = async (code: string) => {
    if (!user) {
      return { error: { message: "User not authenticated" } }
    }

    try {
      const response = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: { message: data.error } }
      }

      await refreshProfile()
      return { error: null }
    } catch (err) {
      return { error: { message: "Failed to verify phone number" } }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      const userProfile = await fetchProfile(user.id)
      setProfile(userProfile)
    }
  }

  const getIndividualId = () => {
    if (!user) return null
    return (user.user_metadata.individual_id as string) || null
  }

  const canAccessDashboard = () => {
    if (!user || !profile) return false

    if (profile.role === "admin") return true

    if (profile.role === "supporter") {
      return profile.is_email_verified && profile.is_phone_verified
    }

    return true
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      return { error }
    } catch (err) {
      console.error("Reset password error:", err)
      return {
        error: {
          message: "An error occurred while sending the reset email.",
          name: "ResetPasswordError",
        },
      }
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    sendVerificationCode,
    verifyPhone,
    refreshProfile,
    getIndividualId,
    canAccessDashboard,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
