"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, Mail, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createAccountForIndividual } from "@/app/actions/supporter-account-actions"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]

interface AddPledgeFormV41Props {
  selectedIndividual?: Individual | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddPledgeFormV41({ selectedIndividual, onSuccess, onCancel }: AddPledgeFormV41Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(selectedIndividual ? 2 : 1)
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [selectedIndividualId, setSelectedIndividualId] = useState(selectedIndividual?.id || "")
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [createUserAccount, setCreateUserAccount] = useState(false)
  const [accountCreationStatus, setAccountCreationStatus] = useState<{
    success?: boolean
    message?: string
  } | null>(null)

  // Individual form data
  const [individualData, setIndividualData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
  })

  // Pledge form data (v41 format)
  const [pledgeData, setPledgeData] = useState({
    // Date of commitment
    dateOfCommitment: new Date().toISOString().split("T")[0], // Default to today

    // Missionary Support (Optional now)
    hasMissionarySupport: false, // Changed from true to false
    missionariesCommitted: 1,
    frequency: "",
    amountPerFrequency: "",

    // Special Support (Optional)
    hasSpecialSupport: false,
    specialSupportAmount: "",
    specialSupportFrequency: "",

    // In-Kind Support (Optional)
    hasInKindSupport: false,
    inKindSupportDetails: "",
  })

  const { toast } = useToast()

  // Calculate yearly totals
  const calculateYearlyTotal = (amount: number, frequency: string) => {
    const multipliers = {
      monthly: 12,
      quarterly: 4,
      annually: 1,
    }
    return amount * (multipliers[frequency as keyof typeof multipliers] || 1)
  }

  const yearlyMissionarySupport =
    pledgeData.amountPerFrequency && pledgeData.frequency
      ? calculateYearlyTotal(Number.parseFloat(pledgeData.amountPerFrequency), pledgeData.frequency)
      : 0

  const yearlySpecialSupport =
    pledgeData.hasSpecialSupport && pledgeData.specialSupportAmount && pledgeData.specialSupportFrequency
      ? calculateYearlyTotal(Number.parseFloat(pledgeData.specialSupportAmount), pledgeData.specialSupportFrequency)
      : 0

  const totalYearlySupport = yearlyMissionarySupport + yearlySpecialSupport

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  useEffect(() => {
    if (step === 1) {
      fetchIndividuals()
    }
  }, [step])

  const fetchIndividuals = async () => {
    try {
      const { data, error } = await supabase.from("individuals").select("*").order("name")

      if (error) throw error
      setIndividuals(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch individuals",
        variant: "destructive",
      })
    }
  }

  const filteredIndividuals = individuals.filter(
    (individual) =>
      individual.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (individual.phone_number && individual.phone_number.includes(searchTerm)) ||
      (individual.email && individual.email.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const handleCreateIndividual = async () => {
    if (!individualData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("individuals")
        .insert([
          {
            name: individualData.name,
            phone_number: individualData.phoneNumber || null,
            email: individualData.email || null,
          },
        ])
        .select()
        .single()

      if (error) throw error

      setSelectedIndividualId(data.id)
      setStep(2)
      toast({
        title: "Success",
        description: "Individual created successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create individual",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreatePledge = async () => {
    if (!selectedIndividualId || !pledgeData.dateOfCommitment) {
      toast({
        title: "Error",
        description: "Please fill in the date of commitment",
        variant: "destructive",
      })
      return
    }

    // Ensure at least one type of support is selected
    if (!pledgeData.hasMissionarySupport && !pledgeData.hasSpecialSupport && !pledgeData.hasInKindSupport) {
      toast({
        title: "Error",
        description: "Please select at least one type of support (Missionary, Special, or In-Kind)",
        variant: "destructive",
      })
      return
    }

    // Validate missionary support if enabled
    if (pledgeData.hasMissionarySupport && (!pledgeData.frequency || !pledgeData.amountPerFrequency)) {
      toast({
        title: "Error",
        description: "Please fill in all missionary support fields or disable missionary support",
        variant: "destructive",
      })
      return
    }

    // Validate special support if enabled
    if (pledgeData.hasSpecialSupport && (!pledgeData.specialSupportAmount || !pledgeData.specialSupportFrequency)) {
      toast({
        title: "Error",
        description: "Please fill in all special support fields or disable special support",
        variant: "destructive",
      })
      return
    }

    // Validate in-kind support if enabled
    if (pledgeData.hasInKindSupport && !pledgeData.inKindSupportDetails.trim()) {
      toast({
        title: "Error",
        description: "Please provide in-kind support details or disable in-kind support",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const pledgeInsert = {
        individual_id: selectedIndividualId,
        date_of_commitment: pledgeData.dateOfCommitment,
        missionaries_committed: pledgeData.hasMissionarySupport ? pledgeData.missionariesCommitted : 0,
        frequency: pledgeData.hasMissionarySupport
          ? (pledgeData.frequency as "monthly" | "quarterly" | "annually")
          : null, // Set to null when no missionary support
        amount_per_frequency: pledgeData.hasMissionarySupport ? Number.parseFloat(pledgeData.amountPerFrequency) : 0,
        special_support_amount: pledgeData.hasSpecialSupport ? Number.parseFloat(pledgeData.specialSupportAmount) : 0,
        special_support_frequency: pledgeData.hasSpecialSupport
          ? (pledgeData.specialSupportFrequency as "monthly" | "quarterly" | "annually")
          : null,
        in_kind_support: pledgeData.hasInKindSupport,
        in_kind_support_details: pledgeData.hasInKindSupport ? pledgeData.inKindSupportDetails : null,
        yearly_missionary_support: yearlyMissionarySupport,
        yearly_special_support: yearlySpecialSupport,
        fulfillment_status: 0,
      }

      const { error } = await supabase.from("pledges").insert([pledgeInsert])

      if (error) throw error

      toast({
        title: "Success",
        description: `Pledge created successfully with total yearly support of ${formatCurrency(totalYearlySupport)}`,
      })

      // If create user account is checked, create a user account for the individual
      if (createUserAccount) {
        try {
          setAccountCreationStatus({ message: "Creating user account..." })
          const result = await createAccountForIndividual(selectedIndividualId)

          if (result.success) {
            setAccountCreationStatus({
              success: true,
              message: "User account created successfully. Verification email sent.",
            })
          } else {
            setAccountCreationStatus({
              success: false,
              message: `Failed to create user account: ${result.error}`,
            })
          }
        } catch (accountError: any) {
          setAccountCreationStatus({
            success: false,
            message: `Error creating user account: ${accountError.message}`,
          })
        }
      }

      // Reset form
      setPledgeData({
        dateOfCommitment: new Date().toISOString().split("T")[0],
        hasMissionarySupport: false,
        missionariesCommitted: 1,
        frequency: "",
        amountPerFrequency: "",
        hasSpecialSupport: false,
        specialSupportAmount: "",
        specialSupportFrequency: "",
        hasInKindSupport: false,
        inKindSupportDetails: "",
      })

      // Don't close the modal immediately if we're showing account creation status
      if (!createUserAccount) {
        onSuccess?.()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create pledge",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedIndividualData = selectedIndividual || individuals.find((i) => i.id === selectedIndividualId)

  // Check if the individual has an email address
  const hasEmail = selectedIndividualData?.email && selectedIndividualData.email.trim() !== ""

  // Check if the individual already has a user account
  const [hasUserAccount, setHasUserAccount] = useState(false)

  useEffect(() => {
    if (selectedIndividualData?.user_id) {
      setHasUserAccount(true)
    } else {
      setHasUserAccount(false)
    }
  }, [selectedIndividualData])

  return (
    <div className="space-y-6">
      {/* Step 1: Select or Create Individual */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Individual</CardTitle>
            <CardDescription>Choose an existing individual or create a new one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Individuals</Label>
              <Input
                id="search"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredIndividuals.length > 0 && (
              <div className="space-y-2">
                <Label>Existing Individuals</Label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredIndividuals.map((individual) => (
                    <div
                      key={individual.id}
                      className={`p-3 border rounded cursor-pointer hover:bg-muted ${
                        selectedIndividualId === individual.id ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => setSelectedIndividualId(individual.id)}
                    >
                      <div className="font-medium">{individual.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {individual.phone_number && <span>{individual.phone_number}</span>}
                        {individual.phone_number && individual.email && <span> • </span>}
                        {individual.email && <span>{individual.email}</span>}
                      </div>
                      {individual.user_id && (
                        <Badge variant="outline" className="mt-1">
                          Has User Account
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Create New Individual</Label>
                <Button variant="outline" size="sm" onClick={() => setShowCreateNew(!showCreateNew)}>
                  {showCreateNew ? "Cancel" : "Create New"}
                </Button>
              </div>

              {showCreateNew && (
                <div className="space-y-4 p-4 border rounded">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={individualData.name}
                      onChange={(e) => setIndividualData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={individualData.phoneNumber}
                        onChange={(e) => setIndividualData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="+251 911 123 456"
                        type="tel"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        value={individualData.email}
                        onChange={(e) => setIndividualData((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        type="email"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateIndividual} disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Individual"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={() => setStep(2)} disabled={!selectedIndividualId && !showCreateNew}>
                Next: Add Pledge
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Create Pledge (v41 Format) */}
      {step === 2 && (
        <>
          {selectedIndividualData && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Individual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{selectedIndividualData.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedIndividualData.phone_number && <span>{selectedIndividualData.phone_number}</span>}
                      {selectedIndividualData.phone_number && selectedIndividualData.email && <span> • </span>}
                      {selectedIndividualData.email && <span>{selectedIndividualData.email}</span>}
                    </div>
                    {selectedIndividualData.user_id && (
                      <Badge variant="outline" className="mt-1">
                        Has User Account
                      </Badge>
                    )}
                  </div>
                  {!selectedIndividual && (
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                      Change Individual
                    </Button>
                  )}
                </div>

                {/* User Account Creation Option */}
                {!hasUserAccount && hasEmail && (
                  <div className="mt-4 p-3 border rounded bg-muted/30">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="create-account"
                        checked={createUserAccount}
                        onCheckedChange={(checked) => setCreateUserAccount(!!checked)}
                      />
                      <div>
                        <Label htmlFor="create-account" className="font-medium">
                          Create User Account
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Create a supporter account for this individual with limited permissions
                        </p>
                      </div>
                    </div>
                    {createUserAccount && (
                      <div className="mt-2 text-sm flex items-center gap-2 text-blue-600">
                        <Mail size={16} />
                        <span>A verification email will be sent to {selectedIndividualData.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {!hasEmail && (
                  <Alert variant="warning" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Email Required</AlertTitle>
                    <AlertDescription>
                      An email address is required to create a user account. Please add an email address to this
                      individual.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Previous Pledges Display */}
          {selectedIndividualData && <PreviousPledgesDisplay individualId={selectedIndividualData.id} />}

          {/* Missionary Support (Required) */}
          <Card>
            <CardHeader>
              <CardTitle>Missionary Support (Optional)</CardTitle>
              <CardDescription>Basic missionary support commitment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date of Commitment */}
              <div className="space-y-2">
                <Label htmlFor="dateOfCommitment">
                  Date of Commitment <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfCommitment"
                  type="date"
                  value={pledgeData.dateOfCommitment}
                  onChange={(e) => setPledgeData((prev) => ({ ...prev, dateOfCommitment: e.target.value }))}
                  required
                />
              </div>

              {/* Make Missionary Support Optional */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="missionary-support"
                  checked={pledgeData.hasMissionarySupport}
                  onCheckedChange={(checked) =>
                    setPledgeData((prev) => ({ ...prev, hasMissionarySupport: checked as boolean }))
                  }
                />
                <Label htmlFor="missionary-support" className="font-medium">
                  Include Missionary Support
                </Label>
              </div>

              {pledgeData.hasMissionarySupport && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="missionaries">
                      Number of Missionaries <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="missionaries"
                      value={pledgeData.missionariesCommitted}
                      onChange={(e) =>
                        setPledgeData((prev) => ({
                          ...prev,
                          missionariesCommitted: Number.parseInt(e.target.value) || 1,
                        }))
                      }
                      type="number"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">
                      Frequency <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={pledgeData.frequency}
                      onValueChange={(value) => setPledgeData((prev) => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount per Frequency (ETB) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="amount"
                      value={pledgeData.amountPerFrequency}
                      onChange={(e) => setPledgeData((prev) => ({ ...prev, amountPerFrequency: e.target.value }))}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {yearlyMissionarySupport > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      Yearly Missionary Support: {formatCurrency(yearlyMissionarySupport)}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    {pledgeData.missionariesCommitted} missionaries ×{" "}
                    {formatCurrency(Number.parseFloat(pledgeData.amountPerFrequency) || 0)} ×{" "}
                    {pledgeData.frequency === "monthly" ? "12" : pledgeData.frequency === "quarterly" ? "4" : "1"} times
                    per year
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Special Support (Optional) */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="special-support"
                  checked={pledgeData.hasSpecialSupport}
                  onCheckedChange={(checked) =>
                    setPledgeData((prev) => ({ ...prev, hasSpecialSupport: checked as boolean }))
                  }
                />
                <div>
                  <CardTitle>Special Support (Optional)</CardTitle>
                  <CardDescription>Additional special project support</CardDescription>
                </div>
              </div>
            </CardHeader>
            {pledgeData.hasSpecialSupport && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialAmount">
                      Special Support Amount (ETB) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="specialAmount"
                      value={pledgeData.specialSupportAmount}
                      onChange={(e) => setPledgeData((prev) => ({ ...prev, specialSupportAmount: e.target.value }))}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialFrequency">
                      Special Support Frequency <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={pledgeData.specialSupportFrequency}
                      onValueChange={(value) => setPledgeData((prev) => ({ ...prev, specialSupportFrequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {yearlySpecialSupport > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">
                        Yearly Special Support: {formatCurrency(yearlySpecialSupport)}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      {formatCurrency(Number.parseFloat(pledgeData.specialSupportAmount) || 0)} ×{" "}
                      {pledgeData.specialSupportFrequency === "monthly"
                        ? "12"
                        : pledgeData.specialSupportFrequency === "quarterly"
                          ? "4"
                          : "1"}{" "}
                      times per year
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* In-Kind Support (Optional) */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inkind-support"
                  checked={pledgeData.hasInKindSupport}
                  onCheckedChange={(checked) =>
                    setPledgeData((prev) => ({ ...prev, hasInKindSupport: checked as boolean }))
                  }
                />
                <div>
                  <CardTitle>In-Kind Support (Optional)</CardTitle>
                  <CardDescription>Non-monetary support like goods, services, etc.</CardDescription>
                </div>
              </div>
            </CardHeader>
            {pledgeData.hasInKindSupport && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inkindDetails">
                    In-Kind Support Details <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="inkindDetails"
                    value={pledgeData.inKindSupportDetails}
                    onChange={(e) => setPledgeData((prev) => ({ ...prev, inKindSupportDetails: e.target.value }))}
                    placeholder="Describe the type of in-kind support (e.g., clothing, books, medical supplies, transportation, etc.)"
                    rows={3}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Total Summary */}
          {totalYearlySupport > 0 && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-primary">Total Yearly Support Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Missionary Support:</span>
                    <Badge variant="default">{formatCurrency(yearlyMissionarySupport)}</Badge>
                  </div>
                  {yearlySpecialSupport > 0 && (
                    <div className="flex justify-between">
                      <span>Special Support:</span>
                      <Badge variant="secondary">{formatCurrency(yearlySpecialSupport)}</Badge>
                    </div>
                  )}
                  {pledgeData.hasInKindSupport && (
                    <div className="flex justify-between">
                      <span>In-Kind Support:</span>
                      <Badge variant="outline">Included</Badge>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Yearly Support:</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {formatCurrency(totalYearlySupport)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Creation Status */}
          {accountCreationStatus && (
            <Alert
              variant={
                accountCreationStatus.success
                  ? "success"
                  : accountCreationStatus.success === false
                    ? "destructive"
                    : "default"
              }
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {accountCreationStatus.success
                  ? "Success"
                  : accountCreationStatus.success === false
                    ? "Error"
                    : "Processing"}
              </AlertTitle>
              <AlertDescription>{accountCreationStatus.message}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleCreatePledge} disabled={isLoading}>
              {isLoading ? "Creating Pledge..." : "Create Pledge"}
            </Button>
            {accountCreationStatus && (
              <Button onClick={onSuccess} variant="outline">
                Close
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PreviousPledgesDisplay({ individualId }: { individualId: string }) {
  const [previousPledges, setPreviousPledges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreviousPledges()
  }, [individualId])

  const fetchPreviousPledges = async () => {
    try {
      const { data, error } = await supabase
        .from("pledges")
        .select("*")
        .eq("individual_id", individualId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setPreviousPledges(data || [])
    } catch (error) {
      console.error("Error fetching previous pledges:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previous Pledges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Loading previous pledges...</div>
        </CardContent>
      </Card>
    )
  }

  if (previousPledges.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previous Pledges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            This will be the first pledge for this individual.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Pledges ({previousPledges.length})</CardTitle>
        <CardDescription>Existing commitments for this individual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {previousPledges.map((pledge, index) => (
            <div key={pledge.id} className="flex items-center justify-between p-3 bg-muted/50 rounded border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Pledge #{index + 1}</Badge>
                  <Badge variant={pledge.fulfillment_status >= 100 ? "default" : "secondary"}>
                    {pledge.fulfillment_status}% fulfilled
                  </Badge>
                </div>
                <div className="text-sm">
                  <span className="font-medium">
                    {formatCurrency((pledge.yearly_missionary_support || 0) + (pledge.yearly_special_support || 0))}
                  </span>
                  <span className="text-muted-foreground"> yearly total</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {pledge.missionaries_committed} missionaries • {pledge.frequency}
                  {pledge.yearly_special_support > 0 && " • Special support included"}
                  {pledge.in_kind_support && " • In-kind support"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(pledge.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
