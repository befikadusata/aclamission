"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"

interface CreateUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserCreated: () => void
}

export function CreateUserModal({ open, onOpenChange, onUserCreated }: CreateUserModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    role: "supporter",
    is_email_verified: false,
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create user profile directly in the profiles table
      const { data, error } = await supabase.from("profiles").insert([
        {
          email: formData.email,
          full_name: formData.full_name,
          phone_number: formData.phone_number || null,
          role: formData.role,
          is_email_verified: formData.is_email_verified,
        },
      ])

      if (error) throw error

      toast({
        title: "User Created",
        description: `User ${formData.email} has been created successfully`,
      })

      // Reset form
      setFormData({
        email: "",
        full_name: "",
        phone_number: "",
        role: "supporter",
        is_email_verified: false,
      })

      onUserCreated()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supporter">Supporter</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_email_verified"
              checked={formData.is_email_verified}
              onCheckedChange={(checked) => setFormData({ ...formData, is_email_verified: checked as boolean })}
            />
            <Label htmlFor="is_email_verified">Email Verified</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
