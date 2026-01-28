import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET() {
  try {
    // Use the server-side client with admin privileges to access auth.users
    const { data: authUsers, error } = await supabaseServer.auth.admin.listUsers()

    if (error) {
      console.error("Error fetching auth users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ authUsers: authUsers.users }, { status: 200 })
  } catch (error: any) {
    console.error("Unexpected error fetching auth users:", error)
    return NextResponse.json({ error: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
