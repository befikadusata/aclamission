import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    if (!code || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Check if the verification code matches and is not expired
    // Since we don't have the verification_code column, we'll use the user metadata
    const { data: user, error: userError } = await supabaseServer.auth.admin.getUserById(userId)

    if (userError || !user) {
      console.error("Error fetching user:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const storedCode = user.user.user_metadata.verification_code
    const expiresAt = user.user.user_metadata.verification_code_expires_at

    if (!storedCode || storedCode !== code) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 })
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      return NextResponse.json({ error: "Verification code has expired" }, { status: 400 })
    }

    // Update the profile to mark phone as verified
    const { error: updateError } = await supabaseServer
      .from("profiles")
      .update({ is_phone_verified: true })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating profile:", updateError)
      return NextResponse.json({ error: "Failed to verify phone number" }, { status: 500 })
    }

    // Clear the verification code from user metadata
    await supabaseServer.auth.admin.updateUserById(userId, {
      user_metadata: {
        verification_code: null,
        verification_code_expires_at: null,
        phone_verified: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error verifying phone:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
