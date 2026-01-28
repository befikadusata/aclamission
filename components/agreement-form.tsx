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

type Agreement = Database["public"]["Tables"]["agreements"]["Row"]

interface AgreementFormProps {
  partnerId: string
  agreement?: Agreement
  onSuccess?: () => void
  onCancel?: () => void
}

export function AgreementForm({ partnerId, agreement, onSuccess, onCancel }: AgreementFormProps) {
  const isEditing = !!agreement
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    agreement_code: agreement?.agreement_code || generateAgreementCode(),
    type: agreement?.type || "",
    frequency: agreement?.frequency || "",
    delivery_type: agreement?.delivery_type || "",
    start_date: agreement?.start_date ? new Date(agreement.start_date).toISOString().split("T")[0] : "",
    end_date: agreement?.end_date ? new Date(agreement.end_date).toISOString().split("T")[0] : "",
    status: agreement?.status || "active",
    total_amount: agreement?.total_amount?.toString() || "",
    notes: agreement?.notes || "",
    support_type: agreement?.support_type || "missionary_support",
    number_of_missionaries: agreement?.number_of_missionaries?.toString() || "",
    amount_per_missionary: agreement?.amount_per_missionary?.toString() || "",
    bank_name: agreement?.bank_name || "",
    bank_account_number: agreement?.bank_account_number || "",
  })
  const { toast } = useToast()

  function generateAgreementCode() {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `AGR-${year}-${randomNum}`
  }

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
      const agreementData = {
        partner_id: partnerId,
        agreement_code: formData.agreement_code,
        type: formData.type,
        frequency: formData.frequency,
        delivery_type: formData.delivery_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: formData.status,
        total_amount: Number.parseFloat(formData.total_amount) || 0,
        notes: formData.notes || null,
        support_type: formData.support_type,
        number_of_missionaries:
          formData.support_type === "missionary_support" ? Number.parseInt(formData.number_of_missionaries) || 0 : null,
        amount_per_missionary:
          formData.support_type === "missionary_support"
            ? Number.parseFloat(formData.amount_per_missionary) || 0
            : null,
        bank_name: formData.delivery_type === "through_partner" ? formData.bank_name || null : null,
        bank_account_number: formData.delivery_type === "through_partner" ? formData.bank_account_number || null : null,
      }

      let error

      if (isEditing && agreement) {
        const { error: updateError } = await supabase.from("agreements").update(agreementData).eq("id", agreement.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase.from("agreements").insert([agreementData])
        error = insertError
      }

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: `Agreement has been ${isEditing ? "updated" : "added"} successfully.`,
      })

      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "add"} agreement`,
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
          <CardTitle>Agreement Details</CardTitle>
          <CardDescription>Basic information about the agreement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agreement_code">
                Agreement Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agreement_code"
                value={formData.agreement_code}
                onChange={(e) => handleInputChange("agreement_code", e.target.value)}
                placeholder="AGR-2023-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">
                Agreement Type <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="one_time">One-Time Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">
                Support Frequency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => handleInputChange("frequency", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="one_time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery_type">
                Support Delivery Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.delivery_type}
                onValueChange={(value) => handleInputChange("delivery_type", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delivery type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_to_missionary">Direct to Missionary</SelectItem>
                  <SelectItem value="through_partner">Through Partner Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="support_type">
              Support Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.support_type}
              onValueChange={(value) => handleInputChange("support_type", value)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select support type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missionary_support">Missionary Support</SelectItem>
                <SelectItem value="special_support">Special Support</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Missionary Support Fields */}
          {formData.support_type === "missionary_support" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="number_of_missionaries">
                  Number of Missionaries <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="number_of_missionaries"
                  type="number"
                  min="1"
                  value={formData.number_of_missionaries}
                  onChange={(e) => handleInputChange("number_of_missionaries", e.target.value)}
                  placeholder="1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount_per_missionary">
                  Amount per Missionary per Month (ETB) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount_per_missionary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount_per_missionary}
                  onChange={(e) => handleInputChange("amount_per_missionary", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>
          )}

          {/* Bank Details */}
          {formData.delivery_type === "through_partner" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">
                  Bank Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange("bank_name", e.target.value)}
                  placeholder="Enter bank name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">
                  Bank Account Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange("bank_account_number", e.target.value)}
                  placeholder="Enter account number"
                  required
                />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange("start_date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange("end_date", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_amount">
                Total Amount (ETB) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => handleInputChange("total_amount", e.target.value)}
                placeholder="0.00"
                required
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
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="awaiting_renewal">Awaiting Renewal</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes about this agreement"
              rows={3}
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
          {isLoading ? (isEditing ? "Updating..." : "Adding...") : isEditing ? "Update Agreement" : "Add Agreement"}
        </Button>
      </div>
    </form>
  )
}
