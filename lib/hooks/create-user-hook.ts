import { supabaseServer } from "@/lib/supabase-server"

export async function createUserHook(event: any) {
  const { user } = event

  // Check if a profile already exists for this user
  const { data: existingProfile } = await supabaseServer.from("profiles").select("*").eq("id", user.id).single()

  if (existingProfile) {
    console.log("Profile already exists for user:", user.id)
    return
  }

  // Create a new profile
  const { error } = await supabaseServer.from("profiles").insert({
    id: user.id,
    full_name: user.user_metadata.full_name || "",
    avatar_url: user.user_metadata.avatar_url || "",
  })

  if (error) {
    console.error("Error creating user profile:", error)
  } else {
    console.log("Created new profile for user:", user.id)
  }
}
