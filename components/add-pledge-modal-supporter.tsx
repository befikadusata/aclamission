"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calculator, CheckCircle2, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createPledge } from "@/app/actions/pledge-actions"

interface AddPledgeModalProps {
  isOpen: boolean
  onClose: () => void
  individual: any
  onSuccess?: () => void
}

export function AddPledgeModalSupporter({ isOpen, onClose, individual, onSuccess }: AddPledgeModalProps) {
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

      // Call success callback and close modal
      setTimeout(() => {
        onSuccess?.()
        onClose()
        setSuccess(false)
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

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setSuccess(false)
      // Reset form when closing
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
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Add New Individual & Pledge</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={isLoading}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {success ? (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">Pledge Created Successfully!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Thank you for your support! The modal will close shortly.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Missionary Support Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Missionary Support (Optional)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Basic missionary support commitment</p>
              </div>

              <div className="space-y-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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

                    {yearlyMissionarySupport > 0 && (
                      <div className="col-span-full p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">
                            Yearly Missionary Support: {formatCurrency(yearlyMissionarySupport)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Special Support Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="special-support"
                  checked={pledgeData.hasSpecialSupport}
                  onCheckedChange={(checked) =>
                    setPledgeData((prev) => ({ ...prev, hasSpecialSupport: checked as boolean }))
                  }
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Special Support (Optional)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Additional special project support</p>
                </div>
              </div>

              {pledgeData.hasSpecialSupport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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

                  {yearlySpecialSupport > 0 && (
                    <div className="col-span-full p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">
                          Yearly Special Support: {formatCurrency(yearlySpecialSupport)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* In-Kind Support Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inkind-support"
                  checked={pledgeData.hasInKindSupport}
                  onCheckedChange={(checked) =>
                    setPledgeData((prev) => ({ ...prev, hasInKindSupport: checked as boolean }))
                  }
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">In-Kind Support (Optional)</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Non-monetary support like goods, services, etc.
                  </p>
                </div>
              </div>

              {pledgeData.hasInKindSupport && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
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
                </div>
              )}
            </div>

            {/* Total Summary */}
            {totalYearlySupport > 0 && (
              <>
                <Separator />
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Yearly Support:</span>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {formatCurrency(totalYearlySupport)}
                    </Badge>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleCreatePledge} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                {isLoading ? "Creating Pledge..." : "Create Pledge"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
