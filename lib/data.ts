import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function getUserProfile(email: string) {
  const supabase = createServerComponentClient({ cookies })

  const { data: profile, error } = await supabase.from("profiles").select("*").eq("email", email).single()

  if (error) {
    console.error("Error fetching user profile:", error)
    return null
  }

  return profile
}

export async function getUserByEmail(email: string) {
  const supabase = createServerComponentClient({ cookies })

  const { data: user, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

export async function createUserProfile(userData: {
  id: string
  email: string
  full_name: string
  phone_number?: string
  role?: string
}) {
  const supabase = createServerComponentClient({ cookies })

  const { data, error } = await supabase
    .from("profiles")
    .insert([
      {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone_number: userData.phone_number,
        role: userData.role || "supporter",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating user profile:", error)
    throw error
  }

  return data
}
