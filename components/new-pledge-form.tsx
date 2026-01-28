"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, CheckCircle2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createPledge } from "@/app/actions/pledge-actions"

interface NewPledgeFormProps {
  individual: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function NewPledgeForm({ individual, onSuccess, onCancel }: NewPledgeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Pledge form data (matching admin v41 format)
  const [pledgeData, setPledgeData] = useState({
    // Date of commitment
    dateOfCommitment: new Date().toISOString().split("T")[0],

    // Missionary Support (Optional)
    hasMissionarySupport: false,
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
      ? calculateYearlyTotal(Number.parseFloat(pledgeData.amountPerFrequency), pledgeData.frequency) *
        pledgeData.missionariesCommitted
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

  const handleCreatePledge = async () => {
    // Validation
    if (!pledgeData.dateOfCommitment) {
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
      const result = await createPledge(individual.id, {
        date_of_commitment: pledgeData.dateOfCommitment,
        missionaries_committed: pledgeData.hasMissionarySupport ? pledgeData.missionariesCommitted : 0,
        frequency: pledgeData.hasMissionarySupport
          ? (pledgeData.frequency as "monthly" | "quarterly" | "annually")
          : null,
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
      })

      if (!result.success) {
        toast({
          title: "Error",
          description: `Failed to create pledge: ${result.error}`,
          variant: "destructive",
        })
        return
      }

      setSuccess(true)
      toast({
        title: "Success",
        description: `Pledge created successfully with total yearly support of ${formatCurrency(totalYearlySupport)}`,
      })

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

      // Redirect after success
      setTimeout(() => {
        onSuccess?.()
      }, 2000)
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

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-300">Pledge Created Successfully!</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          Thank you for your support! You will be redirected to your dashboard shortly.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Individual Information Display */}
      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="font-medium">{individual.name}</div>
              <div className="text-sm text-muted-foreground">{individual.email}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">{individual.phone_number}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">{new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date of Commitment */}
      <Card>
        <CardHeader>
          <CardTitle>Commitment Details</CardTitle>
          <CardDescription>When are you making this commitment?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Missionary Support (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Missionary Support (Optional)</CardTitle>
          <CardDescription>Regular support for missionaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                {pledgeData.frequency === "monthly" ? "12" : pledgeData.frequency === "quarterly" ? "4" : "1"} times per
                year
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
              <CardDescription>Additional support for special projects</CardDescription>
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

      <div className="flex gap-4 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleCreatePledge} disabled={isLoading}>
          {isLoading ? "Creating Pledge..." : "Create Pledge"}
        </Button>
      </div>
    </div>
  )
}
