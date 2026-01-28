"use server"

import { supabaseServer } from "@/lib/supabase-server"
import { supabase } from "@/lib/supabase-client"

export async function createSupporterAccount(formData: {
  email: string
  password: string
  fullName: string
  phoneNumber: string
}) {
  try {
    // Create the auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          phone_number: formData.phoneNumber,
          is_supporter: true,
        },
      },
    })

    if (authError) {
      return { error: authError }
    }

    if (!authData.user) {
      return { error: { message: "Failed to create user account" } }
    }

    // Check if individual already exists by email (to prevent duplicates)
    const { data: existingIndividual, error: checkError } = await supabaseServer
      .from("individuals")
      .select("id")
      .eq("email", formData.email)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "no rows returned"
      console.error("Error checking for existing individual:", checkError)
    }

    let individualId = existingIndividual?.id

    // Only create individual if it doesn't exist
    if (!individualId) {
      const { data: individual, error: individualError } = await supabaseServer
        .from("individuals")
        .insert({
          name: formData.fullName,
          phone_number: formData.phoneNumber,
          email: formData.email,
          user_id: authData.user.id, // Link to auth user
        })
        .select("id")
        .single()

      if (individualError) {
        console.error("Error creating individual:", individualError)
        // Continue without individual_id if this fails
      } else {
        individualId = individual.id
      }
    } else {
      // Update existing individual with user_id if not set
      await supabaseServer.from("individuals").update({ user_id: authData.user.id }).eq("id", individualId)
    }

    // Create profile with supporter role using server client
    const { error: profileError } = await supabaseServer.from("profiles").upsert(
      {
        id: authData.user.id,
        full_name: formData.fullName,
        role: "supporter",
        phone_number: formData.phoneNumber,
        is_phone_verified: false,
      },
      {
        onConflict: "id",
      },
    )

    if (profileError) {
      console.error("Error creating profile:", profileError)
      return { error: { message: "Failed to create user profile" } }
    }

    // Store the individual_id in user metadata if we have one
    if (individualId) {
      await supabase.auth.updateUser({
        data: {
          individual_id: individualId,
        },
      })
    }

    return { error: null, user: authData.user, individualId }
  } catch (err) {
    console.error("Unexpected signup error:", err)
    return {
      error: {
        message: "An unexpected error occurred during registration.",
        name: "SignUpError",
      },
    }
  }
}
