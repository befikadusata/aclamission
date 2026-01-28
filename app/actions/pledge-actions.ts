"use server"

import { supabaseServer } from "@/lib/supabase-server"

export async function createPledge(
  individualId: string,
  pledgeData: {
    date_of_commitment: string
    missionaries_committed?: number
    frequency?: "monthly" | "quarterly" | "annually" | null
    amount_per_frequency?: number
    special_support_amount?: number
    special_support_frequency?: "monthly" | "quarterly" | "annually" | null
    in_kind_support?: boolean
    in_kind_support_details?: string | null
    yearly_missionary_support?: number
    yearly_special_support?: number
    fulfillment_status?: number
  },
) {
  try {
    // Calculate total yearly amount
    const totalYearly = (pledgeData.yearly_missionary_support || 0) + (pledgeData.yearly_special_support || 0)

    // Calculate amount per frequency for missionary support
    let amountPerFrequency = 0
    if (pledgeData.frequency && pledgeData.amount_per_frequency) {
      amountPerFrequency = pledgeData.amount_per_frequency
    }

    // Create the pledge with the correct column names
    const { data, error } = await supabaseServer
      .from("pledges")
      .insert({
        individual_id: individualId,
        missionaries_committed: pledgeData.missionaries_committed || 0,
        yearly_missionary_support: pledgeData.yearly_missionary_support || 0,
        yearly_special_support: pledgeData.yearly_special_support || 0,
        amount: totalYearly,
        amount_per_frequency: amountPerFrequency,
        frequency: pledgeData.frequency,
        special_support_amount: pledgeData.special_support_amount || 0,
        special_support_frequency: pledgeData.special_support_frequency,
        in_kind_support: pledgeData.in_kind_support || false,
        in_kind_support_details: pledgeData.in_kind_support_details || "",
        fulfillment_status: pledgeData.fulfillment_status || 0,
        date_of_commitment: pledgeData.date_of_commitment,
      })
      .select()

    if (error) {
      console.error("Error creating pledge:", error)
      return { success: false, error: error.message }
    }

    return { success: true, pledge: data[0] }
  } catch (error: any) {
    console.error("Error in createPledge:", error)
    return { success: false, error: error.message }
  }
}

export async function getPledgesForIndividual(individualId: string) {
  try {
    const { data, error } = await supabaseServer
      .from("pledges")
      .select("*")
      .eq("individual_id", individualId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pledges:", error)
      return { success: false, error: error.message }
    }

    return { success: true, pledges: data }
  } catch (error: any) {
    console.error("Error in getPledgesForIndividual:", error)
    return { success: false, error: error.message }
  }
}
