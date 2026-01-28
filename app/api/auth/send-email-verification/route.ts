import { NextResponse } from "next/server"
import { emailService } from "@/lib/services/email-service"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    console.log("[v0] Email verification request received")
    console.log("[v0] NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL)
    console.log("[v0] VERCEL_URL:", process.env.VERCEL_URL)
    console.log("[v0] BREVO_API_KEY configured:", !!process.env.BREVO_API_KEY)
    console.log("[v0] BREVO_SENDER_EMAIL:", process.env.BREVO_SENDER_EMAIL)

    const { email, name, userId } = await request.json()

    if (!email || !name || !userId) {
      return NextResponse.json({ error: "Email, name, and userId are required" }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = emailService.generateVerificationToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store verification token in database
    const { error: updateError } = await supabaseServer
      .from("profiles")
      .update({
        email_verification_token: verificationToken,
        email_verification_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (updateError) {
      console.error("[v0] Error storing verification token:", updateError)
      return NextResponse.json({ error: "Failed to store verification token" }, { status: 500 })
    }

    console.log("[v0] Verification token stored in database")

    // Send verification email via Brevo
    const emailResult = await emailService.sendVerificationEmail(email, name, verificationToken)

    if (!emailResult.success) {
      console.warn("[v0] Email sending failed:", emailResult.message)
      // Log the failure but don't block account creation
      // Return success so the account can still be created
      return NextResponse.json({
        message: "Account created successfully. Note: Email verification is currently unavailable. You can still access your account.",
        warning: emailResult.message,
      })
    }

    return NextResponse.json({
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Send verification email error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
