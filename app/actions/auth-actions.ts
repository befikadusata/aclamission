"use server"

import { supabaseServer } from "@/lib/supabase-server"

export async function createSupporterAccount(formData: {
  email: string
  password: string
  fullName: string
  phoneNumber: string
}) {
  try {
    // Validate environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase configuration");
      return {
        error: {
          message: "Server configuration error. Please contact support."
        }
      };
    }

    // Use the Admin API to create the user (since we're using service role key)
    const { data: { user }, error: authError } = await supabaseServer.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: false, // User will need to confirm email
      user_metadata: {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        is_supporter: true,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      }
    });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return { error: authError }
    }

    if (!user) {
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
          user_id: user.id, // Link to auth user
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
      const { error: updateError } = await supabaseServer.from("individuals").update({ user_id: user.id }).eq("id", individualId)
      if (updateError) {
        console.error("Error updating existing individual:", updateError);
      }
    }

    // Create profile with supporter role using server client
    const { error: profileError } = await supabaseServer.from("profiles").upsert(
      {
        id: user.id,
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
      const { error: metadataError } = await supabaseServer.auth.admin.updateUserById(user.id, {
        user_metadata: {
          individual_id: individualId,
        },
      })

      if (metadataError) {
        console.error("Error updating user metadata:", metadataError);
        // Don't fail the whole operation for metadata update failure
      }
    }

    return { error: null, user, individualId }
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
