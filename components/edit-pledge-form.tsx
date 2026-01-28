"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"

type Pledge = Database["public"]["Tables"]["pledges"]["Row"]

interface EditPledgeFormProps {
  pledge: Pledge
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditPledgeForm({ pledge, onSuccess, onCancel }: EditPledgeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: pledge.full_name || "",
    phoneNumber: pledge.phone_number || "",
    email: pledge.email || "",
    dateOfCommitment: pledge.date_of_commitment ? new Date(pledge.date_of_commitment).toISOString().split("T")[0] : "",
    missionariesCommitted: pledge.missionaries_committed || 1,
    frequency: pledge.frequency || "",
    amount: pledge.amount?.toString() || "",
    specialSupportAmount: pledge.special_support_amount?.toString() || "",
    specialSupportFrequency: pledge.special_support_frequency || "",
    inKindSupport: pledge.in_kind_support || false,
    inKindSupportDetails: pledge.in_kind_support_details || "",
    fulfillmentStatus: pledge.fulfillment_status || 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    if (pledge) {
      setFormData({
        fullName: pledge.full_name || "",
        phoneNumber: pledge.phone_number || "",
        email: pledge.email || "",
        dateOfCommitment: pledge.date_of_commitment
          ? new Date(pledge.date_of_commitment).toISOString().split("T")[0]
          : "",
        missionariesCommitted: pledge.missionaries_committed || 1,
        frequency: pledge.frequency || "",
        amount: pledge.amount?.toString() || "",
        specialSupportAmount: pledge.special_support_amount?.toString() || "",
        specialSupportFrequency: pledge.special_support_frequency || "",
        inKindSupport: pledge.in_kind_support || false,
        inKindSupportDetails: pledge.in_kind_support_details || "",
        fulfillmentStatus: pledge.fulfillment_status || 0,
      })
    }
  }, [pledge])

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
      const pledgeData = {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber || null,
        email: formData.email || null,
        date_of_commitment: formData.dateOfCommitment,
        missionaries_committed: formData.missionariesCommitted,
        frequency: formData.frequency,
        amount: Number.parseFloat(formData.amount) || 0,
        special_support_amount: Number.parseFloat(formData.specialSupportAmount) || 0,
        special_support_frequency: formData.specialSupportFrequency || null,
        in_kind_support: formData.inKindSupport,
        in_kind_support_details: formData.inKindSupport ? formData.inKindSupportDetails : null,
        fulfillment_status: formData.fulfillmentStatus,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("pledges").update(pledgeData).eq("id", pledge.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Pledge has been updated successfully.",
      })

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update pledge",
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
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Basic contact information for the pledge</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                placeholder="+1 (555) 123-4567"
                type="tel"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="dateOfCommitment">
                Date of Commitment <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dateOfCommitment"
                value={formData.dateOfCommitment}
                onChange={(e) => handleInputChange("dateOfCommitment", e.target.value)}
                type="date"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missionary Support</CardTitle>
          <CardDescription>Details about missionary support commitment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="missionariesCommitted">
                Number of Missionaries to Support <span className="text-red-500">*</span>
              </Label>
              <Input
                id="missionariesCommitted"
                value={formData.missionariesCommitted}
                onChange={(e) => handleInputChange("missionariesCommitted", Number.parseInt(e.target.value) || 1)}
                type="number"
                min="1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">
                Frequency of Support <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.frequency} onValueChange={(value) => handleInputChange("frequency", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="One-Time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Support Amount (USD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fulfillmentStatus">Fulfillment Status (%)</Label>
              <Input
                id="fulfillmentStatus"
                value={formData.fulfillmentStatus}
                onChange={(e) => handleInputChange("fulfillmentStatus", Number.parseInt(e.target.value) || 0)}
                type="number"
                min="0"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Special Support (Optional)</CardTitle>
          <CardDescription>Additional financial support beyond regular missionary support</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="specialSupportAmount">Special Support Amount (USD)</Label>
              <Input
                id="specialSupportAmount"
                value={formData.specialSupportAmount}
                onChange={(e) => handleInputChange("specialSupportAmount", e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialSupportFrequency">Frequency of Special Support</Label>
              <Select
                value={formData.specialSupportFrequency}
                onValueChange={(value) => handleInputChange("specialSupportFrequency", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="One-Time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>In-Kind Support</CardTitle>
          <CardDescription>Non-monetary support such as goods, services, or materials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="inKindSupport"
              checked={formData.inKindSupport}
              onCheckedChange={(checked) => handleInputChange("inKindSupport", checked)}
            />
            <Label htmlFor="inKindSupport">I will provide in-kind support</Label>
          </div>
          {formData.inKindSupport && (
            <div className="space-y-2">
              <Label htmlFor="inKindSupportDetails">
                In-Kind Support Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="inKindSupportDetails"
                value={formData.inKindSupportDetails}
                onChange={(e) => handleInputChange("inKindSupportDetails", e.target.value)}
                placeholder="Please describe the type of in-kind support you will provide (e.g., clothing, books, medical supplies, educational materials, etc.)"
                rows={3}
                required={formData.inKindSupport}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating Pledge..." : "Update Pledge"}
        </Button>
      </div>
    </form>
  )
}
