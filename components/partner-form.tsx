"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

interface PartnerFormProps {
  partner?: Partner
  onSuccess?: () => void
  onCancel?: () => void
}

// List of countries for the dropdown
const countries = [
  "Ethiopia",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Sudan",
  "South Sudan",
  "Somalia",
  "Djibouti",
  "Eritrea",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Other",
]

export function PartnerForm({ partner, onSuccess, onCancel }: PartnerFormProps) {
  const isEditing = !!partner
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: partner?.name || "",
    type: partner?.type || "",
    country: partner?.country || "",
    contact_person_name: partner?.contact_person_name || "",
    contact_phone: partner?.contact_phone || "",
    contact_email: partner?.contact_email || "",
    address: partner?.address || "",
    notes: partner?.notes || "",
    status: partner?.status || "active",
  })
  const { toast } = useToast()

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const partnerData = {
        name: formData.name,
        type: formData.type,
        country: formData.country || null,
        contact_person_name: formData.contact_person_name || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        address: formData.address || null,
        notes: formData.notes || null,
        status: formData.status,
      }

      let error

      if (isEditing && partner) {
        // Update existing partner
        const { error: updateError } = await supabase.from("partners").update(partnerData).eq("id", partner.id)

        error = updateError
      } else {
        // Create new partner
        const { error: insertError } = await supabase.from("partners").insert([partnerData])

        error = insertError
      }

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: `Partner has been ${isEditing ? "updated" : "added"} successfully.`,
      })

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "add"} partner`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Enter the partner organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter organization name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">
                Organization Type <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="church">Church</SelectItem>
                  <SelectItem value="mission_org">Mission Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(value) => handleInputChange("country", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Contact details for the partner organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_person_name">Contact Person Name</Label>
            <Input
              id="contact_person_name"
              value={formData.contact_person_name}
              onChange={(e) => handleInputChange("contact_person_name", e.target.value)}
              placeholder="Enter contact person name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Phone Number</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange("contact_phone", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email Address</Label>
              <Input
                id="contact_email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange("contact_email", e.target.value)}
                placeholder="contact@example.com"
                type="email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Office Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Enter full address"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
          <CardDescription>Any other relevant details about this partner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes or information"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (isEditing ? "Updating..." : "Adding...") : isEditing ? "Update Partner" : "Add Partner"}
        </Button>
      </div>
    </form>
  )
}
