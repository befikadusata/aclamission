"use server"

import { supabaseServer } from "@/lib/supabase-server"

interface PublicPledgeData {
  fullName: string
  email: string
  phoneNumber: string
  dateOfCommitment: string
  missionariesCommitted: number
  frequency: string | null
  amount: number
  specialSupportAmount: number
  specialSupportFrequency: string | null
  inKindSupport: boolean
  inKindSupportDetails: string | null
}

export async function submitPublicPledge(formData: PublicPledgeData) {
  try {
    console.log("[v0] Public pledge submission:", formData)

    // Validate required fields
    if (!formData.fullName || !formData.phoneNumber) {
      return { success: false, error: "Full name and phone number are required" }
    }

    // Validate that at least one pledge type is selected
    const hasMissionarySupport = formData.amount > 0 && formData.missionariesCommitted > 0
    const hasSpecialSupport = formData.specialSupportAmount > 0
    const hasInKindSupport = formData.inKindSupport && formData.inKindSupportDetails

    if (!hasMissionarySupport && !hasSpecialSupport && !hasInKindSupport) {
      return {
        success: false,
        error: "Please select at least one type of support (Missionary, Special, or In-Kind)",
      }
    }

    // Validate frequency values are provided when amounts are set
    if (hasMissionarySupport && !formData.frequency) {
      return {
        success: false,
        error: "Please select a frequency for missionary support",
      }
    }

    if (hasSpecialSupport && !formData.specialSupportFrequency) {
      return {
        success: false,
        error: "Please select a frequency for special support",
      }
    }

    // Check if individual exists by phone number
    const { data: existingIndividuals, error: searchError } = await supabaseServer
      .from("individuals")
      .select("*")
      .eq("phone_number", formData.phoneNumber)

    if (searchError) {
      console.error("[v0] Error searching for individual:", searchError)
    }

    let individualId: string

    if (existingIndividuals && existingIndividuals.length > 0) {
      // Use existing individual
      const existingIndividual = existingIndividuals[0]
      console.log("[v0] Found existing individual:", existingIndividual.id)
      individualId = existingIndividual.id

      // Update individual details if they've changed
      const { error: updateError } = await supabaseServer
        .from("individuals")
        .update({
          name: formData.fullName,
          email: formData.email || existingIndividual.email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", individualId)

      if (updateError) {
        console.error("[v0] Error updating individual:", updateError)
      }
    } else {
      // Create new individual
      console.log("[v0] Creating new individual")
      const { data: newIndividual, error: createError } = await supabaseServer
        .from("individuals")
        .insert({
          name: formData.fullName,
          phone_number: formData.phoneNumber,
          email: formData.email || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError || !newIndividual) {
        console.error("[v0] Error creating individual:", createError)
        return { success: false, error: "Failed to create individual profile" }
      }

      individualId = newIndividual.id
      console.log("[v0] Created new individual:", individualId)
    }

    // Calculate yearly amounts based on frequency
    const calculateYearlyAmount = (amount: number, frequency: string | null): number => {
      if (!frequency || amount === 0) return 0

      // Normalize to lowercase for comparison
      const freq = frequency.toLowerCase()

      switch (freq) {
        case "monthly":
          return amount * 12
        case "quarterly":
          return amount * 4
        case "annually":
          return amount
        case "one-time":
          return amount
        default:
          return amount * 12
      }
    }

    const yearlyMissionarySupport = calculateYearlyAmount(formData.amount, formData.frequency)
    const yearlySpecialSupport = calculateYearlyAmount(formData.specialSupportAmount, formData.specialSupportFrequency)

    // Create the pledge with pending status
    const pledgeData: any = {
      individual_id: individualId,
      date_of_commitment: formData.dateOfCommitment,
    }

    // Only add frequency and amount if missionary support is selected
    if (formData.amount > 0 && formData.missionariesCommitted > 0) {
      pledgeData.frequency = formData.frequency?.toLowerCase() || null
      pledgeData.amount_per_frequency = formData.amount
      pledgeData.missionaries_committed = formData.missionariesCommitted
      pledgeData.yearly_missionary_support = yearlyMissionarySupport
    } else {
      pledgeData.frequency = null
      pledgeData.amount_per_frequency = 0
      pledgeData.missionaries_committed = 0
      pledgeData.yearly_missionary_support = 0
    }

    // Only add special support if selected
    if (formData.specialSupportAmount > 0) {
      pledgeData.special_support_amount = formData.specialSupportAmount
      pledgeData.special_support_frequency = formData.specialSupportFrequency?.toLowerCase() || null
      pledgeData.yearly_special_support = yearlySpecialSupport
    } else {
      pledgeData.special_support_amount = 0
      pledgeData.special_support_frequency = null
      pledgeData.yearly_special_support = 0
    }

    // Only add in-kind support if selected
    if (formData.inKindSupport && formData.inKindSupportDetails) {
      pledgeData.in_kind_support = true
      pledgeData.in_kind_support_details = formData.inKindSupportDetails
    } else {
      pledgeData.in_kind_support = false
      pledgeData.in_kind_support_details = null
    }

    pledgeData.fulfillment_status = 0 // Pending
    pledgeData.submission_source = "public_link"
    pledgeData.created_at = new Date().toISOString()
    pledgeData.updated_at = new Date().toISOString()

    console.log("[v0] Final pledge data to insert:", JSON.stringify(pledgeData, null, 2))

    const { data: pledge, error: pledgeError } = await supabaseServer
      .from("pledges")
      .insert(pledgeData)
      .select()
      .single()

    if (pledgeError || !pledge) {
      console.error("[v0] Error creating pledge:", pledgeError)
      
      // Provide more specific error messages based on the constraint violation
      let errorMessage = "Failed to create pledge. "
      
      if (pledgeError?.message?.includes("pledges_frequency_missionary_check")) {
        errorMessage += "Please ensure missionary support amount and frequency are both provided."
      } else if (pledgeError?.message?.includes("pledges_special_frequency_check")) {
        errorMessage += "Please ensure special support frequency is valid (monthly, quarterly, or annually)."
      } else if (pledgeError?.message) {
        errorMessage += pledgeError.message
      } else {
        errorMessage += "Please check your form and try again."
      }
      
      return { success: false, error: errorMessage }
    }

    console.log("[v0] Created pledge:", pledge.id)

    // Create notification for admins
    try {
      const { error: notifError } = await supabaseServer.from("notifications").insert({
        title: "New Public Pledge Submission",
        message: `${formData.fullName} has submitted a new pledge via the public form. Please review and approve.`,
        type: "pledge",
        related_id: pledge.id,
        is_read: false,
        for_admins: true,
        created_at: new Date().toISOString(),
      })
      
      if (notifError) {
        console.error("[v0] Error creating notification:", notifError)
      } else {
        console.log("[v0] Admin notification created successfully")
      }
    } catch (notifError) {
      console.error("[v0] Exception creating notification:", notifError)
      // Don't fail the pledge submission if notification fails
    }

    return {
      success: true,
      message: "Thank you! Your pledge has been submitted successfully and is pending review.",
      pledgeId: pledge.id,
    }
  } catch (error: any) {
    console.error("[v0] Public pledge submission error:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}
