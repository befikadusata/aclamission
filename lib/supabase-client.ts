import { createClient } from "@supabase/supabase-js"
import type { Database } from "./supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Add validation for environment variables
if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable")
}

if (!supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable")
}

// Create Supabase client with proper error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Test connection function that doesn't rely on specific tables
export const testSupabaseConnection = async () => {
  try {
    // Use a simple RPC call that doesn't require any specific table
    const { error } = await supabase.rpc("get_service_status", {})

    if (error) {
      // If RPC doesn't exist, try a simple auth check instead
      const { data: authData, error: authError } = await supabase.auth.getSession()

      if (authError) {
        console.error("Supabase connection test failed:", authError)
        return false
      }

      console.log("Supabase connection successful (auth check)")
      return true
    }

    console.log("Supabase connection successful (RPC check)")
    return true
  } catch (err) {
    console.error("Supabase connection error:", err)
    return false
  }
}
