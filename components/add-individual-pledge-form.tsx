"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import { Separator } from "@/components/ui/separator"

type Individual = Database["public"]["Tables"]["individuals"]["Row"]

interface AddIndividualPledgeFormProps {
  selectedIndividual?: Individual | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function AddIndividualPledgeForm({ selectedIndividual, onSuccess, onCancel }: AddIndividualPledgeFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(selectedIndividual ? 2 : 1)
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [selectedIndividualId, setSelectedIndividualId] = useState(selectedIndividual?.id || "")
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateNew, setShowCreateNew] = useState(false)

  // Individual form data
  const [individualData, setIndividualData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
  })

  // Pledge form data
  const [pledgeData, setPledgeData] = useState({
    pledgeType: "",
    numberOfMissionaries: 1,
    frequency: "",
    amount: "",
    inkindDescription: "",
  })

  const { toast } = useToast()

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
    if (!selectedIndividualId || !pledgeData.pledgeType || !pledgeData.frequency) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const pledgeInsert = {
        individual_id: selectedIndividualId,
        pledge_type: pledgeData.pledgeType as "regular_support" | "special_support" | "inkind_support",
        number_of_missionaries: pledgeData.pledgeType === "inkind_support" ? null : pledgeData.numberOfMissionaries,
        frequency: pledgeData.frequency as "monthly" | "quarterly" | "yearly" | "one_time",
        amount: pledgeData.pledgeType === "inkind_support" ? 0 : Number.parseFloat(pledgeData.amount) || 0,
        inkind_description: pledgeData.pledgeType === "inkind_support" ? pledgeData.inkindDescription : null,
        fulfillment_status: 0,
      }

      const { error } = await supabase.from("pledges").insert([pledgeInsert])

      if (error) throw error

      toast({
        title: "Success",
        description: "Pledge created successfully",
      })

      // Reset form
      setPledgeData({
        pledgeType: "",
        numberOfMissionaries: 1,
        frequency: "",
        amount: "",
        inkindDescription: "",
      })

      onSuccess?.()
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

      {/* Step 2: Create Pledge */}
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
                  </div>
                  {!selectedIndividual && (
                    <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                      Change Individual
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Pledge Details</CardTitle>
              <CardDescription>Fill in the pledge information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pledgeType">
                    Pledge Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={pledgeData.pledgeType}
                    onValueChange={(value) => setPledgeData((prev) => ({ ...prev, pledgeType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pledge type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular_support">Regular Support</SelectItem>
                      <SelectItem value="special_support">Special Support</SelectItem>
                      <SelectItem value="inkind_support">In-Kind Support</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="one_time">One-Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {pledgeData.pledgeType !== "inkind_support" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numberOfMissionaries">Number of Missionaries</Label>
                    <Input
                      id="numberOfMissionaries"
                      value={pledgeData.numberOfMissionaries}
                      onChange={(e) =>
                        setPledgeData((prev) => ({
                          ...prev,
                          numberOfMissionaries: Number.parseInt(e.target.value) || 1,
                        }))
                      }
                      type="number"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount (ETB) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="amount"
                      value={pledgeData.amount}
                      onChange={(e) => setPledgeData((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {pledgeData.pledgeType === "inkind_support" && (
                <div className="space-y-2">
                  <Label htmlFor="inkindDescription">
                    In-Kind Support Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="inkindDescription"
                    value={pledgeData.inkindDescription}
                    onChange={(e) => setPledgeData((prev) => ({ ...prev, inkindDescription: e.target.value }))}
                    placeholder="Describe the type of in-kind support (e.g., clothing, books, medical supplies, etc.)"
                    rows={3}
                  />
                </div>
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
