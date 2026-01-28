import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

// Ensure we're using the service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment variables are available
if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}
if (!supabaseServiceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

// Create the Supabase client, with fallback for missing configuration
let supabaseClient;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase configuration is incomplete. Server functions may not work properly.");

  // Create a mock client that will fail gracefully
  supabaseClient = {
    auth: {
      admin: {
        createUser: async () => ({
          data: { user: null },
          error: { message: "Supabase is not configured properly" }
        }),
        updateUserById: async () => ({
          error: { message: "Supabase is not configured properly" }
        }),
        listUsers: async () => ({
          data: { users: [] },
          error: { message: "Supabase is not configured properly" }
        })
      }
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (column: string, value: any) => ({
          maybeSingle: async () => ({ data: null, error: null })
        }),
        single: async () => ({ data: null, error: null })
      }),
      insert: (data: any) => ({
        select: (columns?: string) => ({
          single: async () => ({ data: null, error: null })
        })
      }),
      update: (data: any) => ({
        eq: async (column: string, value: any) => ({ error: null })
      }),
      upsert: (data: any, options?: any) => ({
        select: (columns?: string) => ({
          single: async () => ({ data: null, error: null })
        })
      })
    })
  }
} else {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const supabaseServer = supabaseClient

// Export as both supabaseServer and supabase for compatibility
export const supabase = supabaseServer
