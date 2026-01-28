"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Phone, User, Save, AlertCircle } from "lucide-react"
import { SupporterDashboardLayout } from "@/components/supporter-dashboard-layout"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SupporterProfilePage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [individual, setIndividual] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone_number: "",
  })
  const { toast } = useToast()

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

    fetchIndividual()
  }, [user, profile, router])

  const fetchIndividual = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      // First try to find by user_id
      const { data, error } = await supabase.from("individuals").select("*").eq("user_id", user.id).maybeSingle()

      if (error) {
        console.error("Error fetching individual by user_id:", error)
        // If that fails, try by individual_id from metadata
        const individualId = user.user_metadata?.individual_id
        if (individualId) {
          const { data: metadataData, error: metadataError } = await supabase
            .from("individuals")
            .select("*")
            .eq("id", individualId)
            .maybeSingle()

          if (metadataError) {
            console.error("Error fetching individual by metadata:", metadataError)
            setError("Unable to fetch profile information")
          } else {
            data = metadataData
          }
        }
      }

      if (data) {
        setIndividual(data)
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone_number: data.phone_number || "",
        })
      } else {
        // No individual record found, prepare for creation
        setFormData({
          name: user.user_metadata?.full_name || profile?.full_name || "",
          email: user.email || "",
          phone_number: profile?.phone_number || "",
        })
      }
    } catch (err) {
      console.error("Unexpected error fetching individual:", err)
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const createIndividual = async () => {
    if (!user) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from("individuals")
        .insert({
          name: formData.name || user.user_metadata?.full_name || "Unknown",
          email: formData.email || user.email,
          phone_number: formData.phone_number || profile?.phone_number,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      // Update user metadata with individual_id
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          individual_id: data.id,
        },
      })

      if (updateError) {
        console.error("Error updating user metadata:", updateError)
      }

      setIndividual(data)
      toast({
        title: "Profile Created",
        description: "Your profile has been created successfully.",
      })
    } catch (error: any) {
      console.error("Error creating individual:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from("individuals")
        .update({
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone_number,
        })
        .eq("id", individual.id)

      if (error) {
        throw error
      }

      // Update local state
      setIndividual((prev: any) => ({
        ...prev,
        name: formData.name,
        email: formData.email,
        phone_number: formData.phone_number,
      }))

      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      })
      setIsEditing(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SupporterDashboardLayout title="My Profile" subtitle="Manage your personal information">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupporterDashboardLayout>
    )
  }

  if (error) {
    return (
      <SupporterDashboardLayout title="My Profile" subtitle="Manage your personal information">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </SupporterDashboardLayout>
    )
  }

  if (!individual) {
    return (
      <SupporterDashboardLayout title="My Profile" subtitle="Set up your profile information">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Profile</CardTitle>
              <CardDescription>
                We need to set up your profile information to continue. Please review and confirm your details below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={createIndividual} disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <User className="mr-2 h-4 w-4" />}
                    {isCreating ? "Creating Profile..." : "Create My Profile"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SupporterDashboardLayout>
    )
  }

  return (
    <SupporterDashboardLayout title="My Profile" subtitle="Manage your personal information">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your contact details and profile information</CardDescription>
                </div>
                {!isEditing && (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="font-medium">{individual?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                      <p className="font-medium">{individual?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
                      <p className="font-medium">{individual?.phone_number}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Verified</span>
                <span className="text-sm font-medium text-green-600">✓ Verified</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Phone Verified</span>
                <span className="text-sm font-medium text-green-600">✓ Verified</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Account Type</span>
                <span className="text-sm font-medium">Supporter</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push("/supporter-dashboard/pledges")}
              >
                View My Pledges
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => router.push("/supporter-dashboard/new-pledge")}
              >
                Create New Pledge
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" onClick={() => (window.location.href = "/api/auth/signout")}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SupporterDashboardLayout>
  )
}
