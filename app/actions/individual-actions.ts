"use server"

import { supabaseServer } from "@/lib/supabase-server"

export async function createIndividualForUser(
  userId: string,
  userData: {
    fullName: string
    email: string
    phoneNumber: string
  },
) {
  try {
    // First check if individual already exists by user_id
    const { data: existingByUserId, error: userIdError } = await supabaseServer
      .from("individuals")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()

    if (existingByUserId) {
      return { success: true, individualId: existingByUserId.id }
    }

    // Then check if individual already exists by email
    const { data: existingByEmail, error: emailError } = await supabaseServer
      .from("individuals")
      .select("id, user_id")
      .eq("email", userData.email)
      .maybeSingle()

    if (existingByEmail) {
      // If individual exists but doesn't have user_id, link it
      if (!existingByEmail.user_id) {
        const { error: updateError } = await supabaseServer
          .from("individuals")
          .update({ user_id: userId })
          .eq("id", existingByEmail.id)

        if (updateError) {
          console.error("Error linking existing individual:", updateError)
          return { success: false, error: updateError.message }
        }
      }

      return { success: true, individualId: existingByEmail.id }
    }

    // Create a new individual record only if none exists
    const { data: newIndividual, error: createError } = await supabaseServer
      .from("individuals")
      .insert({
        name: userData.fullName,
        email: userData.email,
        phone_number: userData.phoneNumber,
        user_id: userId,
      })
      .select("id")
      .single()

    if (createError) {
      console.error("Error creating individual:", createError)
      return { success: false, error: createError.message }
    }

    // Update user metadata with the individual ID
    const { error: metadataError } = await supabaseServer.auth.admin.updateUserById(userId, {
      user_metadata: {
        individual_id: newIndividual.id,
      },
    })

    if (metadataError) {
      console.error("Error updating user metadata:", metadataError)
      // Don't fail the whole operation for this
    }

    return { success: true, individualId: newIndividual.id }
  } catch (error: any) {
    console.error("Error in createIndividualForUser:", error)
    return { success: false, error: error.message }
  }
}

export async function getOrCreateIndividualForUser(
  userId: string,
  userEmail: string,
  userData?: {
    fullName: string
    phoneNumber: string
  },
) {
  try {
    // First try to find by user_id
    const { data: byUserId, error: userIdError } = await supabaseServer
      .from("individuals")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (byUserId) {
      return { success: true, individual: byUserId }
    }

    // Then try to find by email
    const { data: byEmail, error: emailError } = await supabaseServer
      .from("individuals")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle()

    if (byEmail) {
      // Link existing individual to user
      const { data: updated, error: updateError } = await supabaseServer
        .from("individuals")
        .update({ user_id: userId })
        .eq("id", byEmail.id)
        .select("*")
        .single()

      if (updateError) {
        console.error("Error linking individual:", updateError)
        return { success: false, error: updateError.message }
      }

      return { success: true, individual: updated }
    }

    // Create new individual only if userData is provided
    if (!userData) {
      return { success: false, error: "No individual found and no data provided to create one" }
    }

    const { data: newIndividual, error: createError } = await supabaseServer
      .from("individuals")
      .insert({
        name: userData.fullName,
        email: userEmail,
        phone_number: userData.phoneNumber,
        user_id: userId,
      })
      .select("*")
      .single()

    if (createError) {
      console.error("Error creating individual:", createError)
      return { success: false, error: createError.message }
    }

    return { success: true, individual: newIndividual }
  } catch (error: any) {
    console.error("Error in getOrCreateIndividualForUser:", error)
    return { success: false, error: error.message }
  }
}
