import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/types/supabase"

// Ensure we're using the service role key for admin access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseServer = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Export as both supabaseServer and supabase for compatibility
export const supabase = supabaseServer
