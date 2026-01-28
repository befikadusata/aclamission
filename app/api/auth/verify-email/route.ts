import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    // Find user with this verification token
    const { data: profile, error: findError } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("email_verification_token", token)
      .single()

    if (findError || !profile) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 })
    }

    // Check if token is expired
    const now = new Date()
    const expiresAt = new Date(profile.email_verification_expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ error: "Verification token has expired" }, { status: 400 })
    }

    // Mark email as verified and clear token
    const { error: updateError } = await supabaseServer
      .from("profiles")
      .update({
        is_email_verified: true,
        email_verification_token: null,
        email_verification_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)

    if (updateError) {
      console.error("Error updating profile:", updateError)
      return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Email verified successfully",
    })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
