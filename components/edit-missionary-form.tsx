"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Database } from "@/lib/supabase"

type Missionary = Database["public"]["Tables"]["missionaries"]["Row"]

interface EditMissionaryFormProps {
  missionary: Missionary
  onSuccess?: () => void
  onCancel?: () => void
}

export function EditMissionaryForm({ missionary, onSuccess, onCancel }: EditMissionaryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(missionary.photo_url)
  const [formData, setFormData] = useState({
    // Basic Information
    name: missionary.name || "",
    phone: missionary.phone || "",
    email: missionary.email || "",
    countryOfService: missionary.country_of_service || "",
    areaOfMinistry: missionary.area_of_ministry || "",
    ministryDescription: missionary.ministry_description || "",
    status: missionary.status || "active",

    // Personal and Demographic Info
    gender: missionary.gender || "",
    age: missionary.age?.toString() || "",
    maritalStatus: missionary.marital_status || "",
    numberOfFamilyMembers: missionary.number_of_family_members?.toString() || "",

    // Background Information
    denomination: missionary.denomination || "",
    church: missionary.church || "",
    educationalStatus: missionary.educational_status || "",
    language: missionary.language || "",

    // Geographical Info
    region: missionary.region || "",
    zone: missionary.zone || "",
    woreda: missionary.woreda || "",

    // Admin and Financial Info
    informationApprovedBy: missionary.information_approved_by || "",
    monthlySupportAmount: missionary.monthly_support_amount?.toString() || "",
  })
  const { toast } = useToast()

  const [agreements, setAgreements] = useState<any[]>([])
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>(missionary.agreement_id || "")

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const { data, error } = await supabase
          .from("agreements")
          .select("id, agreement_code, support_type")
          .eq("partner_id", missionary.partner_id)
          .eq("support_type", "missionary_support")
          .eq("status", "active")

        if (error) {
          console.error("Error fetching agreements:", error)
          return
        }

        setAgreements(data || [])
      } catch (error) {
        console.error("Error fetching agreements:", error)
      }
    }

    fetchAgreements()
  }, [missionary.partner_id])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]

      // Validate file size (5MB max for photos)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Photo size must be less than 5MB",
          variant: "destructive",
        })
        return
      }

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"]
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Error",
          description: "Please select a JPG or PNG image file",
          variant: "destructive",
        })
        return
      }

      setSelectedPhoto(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemovePhoto = () => {
    setSelectedPhoto(null)
    setPhotoPreview(null)
    const fileInput = document.getElementById("photo-upload") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const uploadPhoto = async (): Promise<string | null> => {
    if (!selectedPhoto) return null

    try {
      const timestamp = Date.now()
      const fileExtension = selectedPhoto.name.split(".").pop()
      const fileName = `missionary_${timestamp}.${fileExtension}`

      const { data, error } = await supabase.storage.from("documents").upload(fileName, selectedPhoto, {
        contentType: selectedPhoto.type,
        upsert: false,
      })

      if (error) {
        console.error("Photo upload error:", error)
        return null
      }

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName)
      return urlData.publicUrl
    } catch (error) {
      console.error("Photo upload error:", error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Upload photo if selected
      let photoUrl = photoPreview
      if (selectedPhoto) {
        const newPhotoUrl = await uploadPhoto()
        if (newPhotoUrl) {
          photoUrl = newPhotoUrl
        } else {
          toast({
            title: "Warning",
            description: "Photo upload failed, but missionary will be updated without new photo",
          })
        }
      }

      // Update missionary record
      const updateData = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        country_of_service: formData.countryOfService || null,
        ministry_description: formData.ministryDescription || null,
        status: formData.status,
        photo_url: photoUrl,
        area_of_ministry: formData.areaOfMinistry || null,
        agreement_id: selectedAgreementId || null,

        // Personal and Demographic Info
        gender: formData.gender || null,
        age: formData.age ? Number.parseInt(formData.age) : null,
        marital_status: formData.maritalStatus || null,
        number_of_family_members: formData.numberOfFamilyMembers
          ? Number.parseInt(formData.numberOfFamilyMembers)
          : null,

        // Background Information
        denomination: formData.denomination || null,
        church: formData.church || null,
        educational_status: formData.educationalStatus || null,
        language: formData.language || null,

        // Geographical Info
        region: formData.region || null,
        zone: formData.zone || null,
        woreda: formData.woreda || null,

        // Admin and Financial Info
        information_approved_by: formData.informationApprovedBy || null,
        monthly_support_amount: formData.monthlySupportAmount ? Number.parseFloat(formData.monthlySupportAmount) : null,

        updated_at: new Date().toISOString(),
      }

      const { error: updateError } = await supabase.from("missionaries").update(updateData).eq("id", missionary.id)

      if (updateError) {
        throw updateError
      }

      toast({
        title: "Success",
        description: "Missionary has been updated successfully.",
      })

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update missionary",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Essential missionary details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Profile Photo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={photoPreview || ""} alt="Preview" />
                <AvatarFallback>
                  <User className="w-8 h-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                {selectedPhoto ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{selectedPhoto.name}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {photoPreview ? "Change Photo" : "Upload Photo"}
                        </span>
                      </Button>
                    </Label>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Supports JPG, PNG (max 5MB)</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+251 911 123456"
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
              <Label htmlFor="countryOfService">Country of Service</Label>
              <Input
                id="countryOfService"
                value={formData.countryOfService}
                onChange={(e) => handleInputChange("countryOfService", e.target.value)}
                placeholder="e.g., Ethiopia, Kenya, Brazil"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="areaOfMinistry">
              Area of Ministry <span className="text-red-500">*</span>
            </Label>
            <Input
              id="areaOfMinistry"
              value={formData.areaOfMinistry}
              onChange={(e) => handleInputChange("areaOfMinistry", e.target.value)}
              placeholder="e.g., Church Planting, Medical Missions, Education"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ministryDescription">Ministry Description</Label>
            <Textarea
              id="ministryDescription"
              value={formData.ministryDescription}
              onChange={(e) => handleInputChange("ministryDescription", e.target.value)}
              placeholder="Describe the missionary's work and ministry focus..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Personal and Demographic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal & Demographic Information</CardTitle>
          <CardDescription>Personal details about the missionary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                placeholder="Enter age"
                min="1"
                max="150"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select
                value={formData.maritalStatus}
                onValueChange={(value) => handleInputChange("maritalStatus", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numberOfFamilyMembers">Number of Family Members</Label>
              <Input
                id="numberOfFamilyMembers"
                type="number"
                value={formData.numberOfFamilyMembers}
                onChange={(e) => handleInputChange("numberOfFamilyMembers", e.target.value)}
                placeholder="Enter number of family members"
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background Information */}
      <Card>
        <CardHeader>
          <CardTitle>Background Information</CardTitle>
          <CardDescription>Religious and educational background</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="denomination">Denomination</Label>
              <Input
                id="denomination"
                value={formData.denomination}
                onChange={(e) => handleInputChange("denomination", e.target.value)}
                placeholder="e.g., Baptist, Methodist, Presbyterian"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="church">Church</Label>
              <Input
                id="church"
                value={formData.church}
                onChange={(e) => handleInputChange("church", e.target.value)}
                placeholder="Enter church name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="educationalStatus">Educational Status</Label>
              <Input
                id="educationalStatus"
                value={formData.educationalStatus}
                onChange={(e) => handleInputChange("educationalStatus", e.target.value)}
                placeholder="e.g., Bachelor's Degree, Master's, PhD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Languages</Label>
              <Input
                id="language"
                value={formData.language}
                onChange={(e) => handleInputChange("language", e.target.value)}
                placeholder="e.g., English, Amharic, Spanish"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geographical Information */}
      <Card>
        <CardHeader>
          <CardTitle>Geographical Information</CardTitle>
          <CardDescription>Location details within Ethiopia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => handleInputChange("region", e.target.value)}
                placeholder="Enter region"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Zone</Label>
              <Input
                id="zone"
                value={formData.zone}
                onChange={(e) => handleInputChange("zone", e.target.value)}
                placeholder="Enter zone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="woreda">Woreda</Label>
              <Input
                id="woreda"
                value={formData.woreda}
                onChange={(e) => handleInputChange("woreda", e.target.value)}
                placeholder="Enter woreda"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin and Financial Information */}
      <Card>
        <CardHeader>
          <CardTitle>Administrative & Financial Information</CardTitle>
          <CardDescription>Approval and financial support details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="informationApprovedBy">Information Approved By</Label>
              <Input
                id="informationApprovedBy"
                value={formData.informationApprovedBy}
                onChange={(e) => handleInputChange("informationApprovedBy", e.target.value)}
                placeholder="Enter approver's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlySupportAmount">Monthly Support Amount (ETB)</Label>
              <Input
                id="monthlySupportAmount"
                type="number"
                step="0.01"
                value={formData.monthlySupportAmount}
                onChange={(e) => handleInputChange("monthlySupportAmount", e.target.value)}
                placeholder="Enter amount in ETB"
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agreement">Link to Agreement (Optional)</Label>
            <Select value={selectedAgreementId} onValueChange={setSelectedAgreementId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agreement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_agreement">No Agreement</SelectItem>
                {agreements.map((agreement) => (
                  <SelectItem key={agreement.id} value={agreement.id}>
                    {agreement.agreement_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {isLoading ? "Updating Missionary..." : "Update Missionary"}
        </Button>
      </div>
    </form>
  )
}
