"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]

interface EditIndividualModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  individual: Individual | null
  onSuccess?: () => void
}

export function EditIndividualModal({ open, onOpenChange, individual, onSuccess }: EditIndividualModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: individual?.name || "",
    phoneNumber: individual?.phone_number || "",
    email: individual?.email || "",
  })
  const { toast } = useToast()

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!individual) return

    setIsLoading(true)

    try {
      const updateData = {
        name: formData.name,
        phone_number: formData.phoneNumber || null,
        email: formData.email || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("individuals").update(updateData).eq("id", individual.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Individual information has been updated successfully.",
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update individual",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset form data
    setFormData({
      name: individual?.name || "",
      phoneNumber: individual?.phone_number || "",
      email: individual?.email || "",
    })
  }

  if (!individual) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Individual</DialogTitle>
          <DialogDescription>Update the individual's contact information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic contact information for the individual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    placeholder="+251 911 123 456"
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Individual"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
