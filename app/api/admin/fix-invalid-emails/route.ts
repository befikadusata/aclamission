import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all invalid emails
    const { data: invalidEmails, error: invalidEmailsError } = await supabase.rpc("get_invalid_emails")

    if (invalidEmailsError) {
      console.error("Error getting invalid emails:", invalidEmailsError)
      return NextResponse.json({ error: invalidEmailsError.message }, { status: 500 })
    }

    return NextResponse.json({ invalidEmails })
  } catch (error) {
    console.error("Error in fix-invalid-emails route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated and is an admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Run the fix function
    const { data: fixResults, error: fixError } = await supabase.rpc("admin_fix_invalid_emails")

    if (fixError) {
      console.error("Error fixing invalid emails:", fixError)
      return NextResponse.json({ error: fixError.message }, { status: 500 })
    }

    // Get remaining invalid emails after fixes
    const { data: remainingInvalid, error: remainingError } = await supabase.rpc("get_invalid_emails")

    if (remainingError) {
      console.error("Error getting remaining invalid emails:", remainingError)
    }

    return NextResponse.json({
      fixed: fixResults,
      remaining: remainingInvalid || [],
    })
  } catch (error) {
    console.error("Error in fix-invalid-emails route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
