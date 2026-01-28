import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"

type Partner = Database["public"]["Tables"]["partners"]["Row"]

export async function getPartner(partnerId: string): Promise<Partner | null> {
  try {
    const { data, error } = await supabase.from("partners").select("*").eq("id", partnerId).single()

    if (error) {
      console.error("Error fetching partner:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in getPartner:", error)
    throw error
  }
}

export async function getPartners(): Promise<Partner[]> {
  try {
    const { data, error } = await supabase.from("partners").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching partners:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error in getPartners:", error)
    throw error
  }
}

export async function createPartner(partner: Omit<Partner, "id" | "created_at" | "updated_at">): Promise<Partner> {
  try {
    const { data, error } = await supabase.from("partners").insert([partner]).select().single()

    if (error) {
      console.error("Error creating partner:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in createPartner:", error)
    throw error
  }
}

export async function updatePartner(partnerId: string, updates: Partial<Partner>): Promise<Partner> {
  try {
    const { data, error } = await supabase.from("partners").update(updates).eq("id", partnerId).select().single()

    if (error) {
      console.error("Error updating partner:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in updatePartner:", error)
    throw error
  }
}

export async function deletePartner(partnerId: string): Promise<void> {
  try {
    const { error } = await supabase.from("partners").delete().eq("id", partnerId)

    if (error) {
      console.error("Error deleting partner:", error)
      throw error
    }
  } catch (error) {
    console.error("Error in deletePartner:", error)
    throw error
  }
}
