"use client"

import React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, Heart, Users, Gift } from "lucide-react"
import { submitPublicPledge } from "@/app/actions/public-pledge-actions"

export function PublicPledgeForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: "",
    email: "",
    phoneNumber: "",
    dateOfCommitment: new Date().toISOString().split("T")[0],

    // Pledge Type Selections
    includeMissionarySupport: false,
    includeSpecialSupport: false,
    includeInKindSupport: false,

    // Missionary Support
    missionariesCommitted: 1,
    missionaryFrequency: "Monthly",
    missionaryAmount: "",

    // Special Support
    specialSupportAmount: "",
    specialSupportFrequency: "Monthly",

    // In-Kind Support
    inKindSupportDetails: "",
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validation
      if (!formData.includeMissionarySupport && !formData.includeSpecialSupport && !formData.includeInKindSupport) {
        toast({
          title: "Error",
          description: "Please select at least one type of support",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (formData.includeMissionarySupport && !formData.missionaryAmount) {
        toast({
          title: "Error",
          description: "Please enter missionary support amount",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (formData.includeSpecialSupport && !formData.specialSupportAmount) {
        toast({
          title: "Error",
          description: "Please enter special support amount",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      if (formData.includeInKindSupport && !formData.inKindSupportDetails) {
        toast({
          title: "Error",
          description: "Please provide in-kind support details",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const pledgeData = {
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfCommitment: formData.dateOfCommitment,
        missionariesCommitted: formData.includeMissionarySupport ? formData.missionariesCommitted : 0,
        frequency: formData.includeMissionarySupport ? formData.missionaryFrequency : null,
        amount: formData.includeMissionarySupport ? Number.parseFloat(formData.missionaryAmount) : 0,
        specialSupportAmount: formData.includeSpecialSupport ? Number.parseFloat(formData.specialSupportAmount) : 0,
        specialSupportFrequency: formData.includeSpecialSupport ? formData.specialSupportFrequency : null,
        inKindSupport: formData.includeInKindSupport,
        inKindSupportDetails: formData.includeInKindSupport ? formData.inKindSupportDetails : null,
      }

      console.log("[v0] Submitting pledge data:", pledgeData)
      const result = await submitPublicPledge(pledgeData)

      if (result.success) {
        setIsSuccess(true)
        toast({
          title: "Success!",
          description: result.message || "Your pledge has been submitted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to submit pledge",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit pledge",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      phoneNumber: "",
      dateOfCommitment: new Date().toISOString().split("T")[0],
      includeMissionarySupport: false,
      includeSpecialSupport: false,
      includeInKindSupport: false,
      missionariesCommitted: 1,
      missionaryFrequency: "Monthly",
      missionaryAmount: "",
      specialSupportAmount: "",
      specialSupportFrequency: "Monthly",
      inKindSupportDetails: "",
    })
    setIsSuccess(false)
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="mb-4 h-16 w-16 text-green-600" />
            <h2 className="mb-2 text-2xl font-bold text-green-900">Thank You for Your Commitment!</h2>
            <p className="mb-6 max-w-md text-center text-muted-foreground">
              Your pledge has been submitted successfully and is now pending review. Our team will contact you soon to
              confirm your commitment.
            </p>
            <Button onClick={resetForm} className="bg-green-600 hover:bg-green-700">
              Submit Another Pledge
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Please provide your contact details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                placeholder="+260 XXX XXX XXX"
                type="tel"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your.email@example.com"
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

      {/* Pledge Type Selection */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle>Type of Support</CardTitle>
          <CardDescription>Select one or more types of support you would like to commit to (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
            <Checkbox
              id="includeMissionarySupport"
              checked={formData.includeMissionarySupport}
              onCheckedChange={(checked) => handleInputChange("includeMissionarySupport", checked)}
            />
            <Label
              htmlFor="includeMissionarySupport"
              className="flex flex-1 cursor-pointer items-center space-x-2 font-medium"
            >
              <Users className="h-5 w-5 text-blue-600" />
              <span>Missionary Support</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
            <Checkbox
              id="includeSpecialSupport"
              checked={formData.includeSpecialSupport}
              onCheckedChange={(checked) => handleInputChange("includeSpecialSupport", checked)}
            />
            <Label htmlFor="includeSpecialSupport" className="flex flex-1 cursor-pointer items-center space-x-2 font-medium">
              <Heart className="h-5 w-5 text-purple-600" />
              <span>Special Support</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
            <Checkbox
              id="includeInKindSupport"
              checked={formData.includeInKindSupport}
              onCheckedChange={(checked) => handleInputChange("includeInKindSupport", checked)}
            />
            <Label htmlFor="includeInKindSupport" className="flex flex-1 cursor-pointer items-center space-x-2 font-medium">
              <Gift className="h-5 w-5 text-orange-600" />
              <span>In-Kind Support</span>
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Missionary Support Details */}
      {formData.includeMissionarySupport && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Missionary Support Details</span>
            </CardTitle>
            <CardDescription>Specify your commitment to support missionaries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <Label htmlFor="missionaryFrequency">
                  Frequency of Support <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.missionaryFrequency}
                  onValueChange={(value) => handleInputChange("missionaryFrequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="One-Time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="missionaryAmount">
                Support Amount (K) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="missionaryAmount"
                value={formData.missionaryAmount}
                onChange={(e) => handleInputChange("missionaryAmount", e.target.value)}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
                required
              />
              <p className="text-xs text-muted-foreground">Amount per frequency selected above</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Support Details */}
      {formData.includeSpecialSupport && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-purple-600" />
              <span>Special Support Details</span>
            </CardTitle>
            <CardDescription>Additional financial support beyond regular missionary support</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="specialSupportAmount">
                  Special Support Amount (K) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="specialSupportAmount"
                  value={formData.specialSupportAmount}
                  onChange={(e) => handleInputChange("specialSupportAmount", e.target.value)}
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialSupportFrequency">
                  Frequency of Special Support <span className="text-red-500">*</span>
                </Label>
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
                    <SelectItem value="Annually">Annually</SelectItem>
                    <SelectItem value="One-Time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In-Kind Support Details */}
      {formData.includeInKindSupport && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-orange-600" />
              <span>In-Kind Support Details</span>
            </CardTitle>
            <CardDescription>Non-monetary support such as goods, services, or materials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inKindSupportDetails">
                Description of In-Kind Support <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="inKindSupportDetails"
                value={formData.inKindSupportDetails}
                onChange={(e) => handleInputChange("inKindSupportDetails", e.target.value)}
                placeholder="Please describe the type of in-kind support you will provide (e.g., clothing, books, medical supplies, educational materials, food items, transportation services, etc.)"
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Provide as much detail as possible about what you plan to contribute
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="submit" size="lg" disabled={isLoading} className="w-full md:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Pledge...
            </>
          ) : (
            "Submit Pledge"
          )}
        </Button>
      </div>
    </form>
  )
}
