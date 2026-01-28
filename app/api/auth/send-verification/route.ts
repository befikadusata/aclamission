import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { smsService } from "@/lib/services/sms-service"

export async function POST(request: Request) {
  try {
    const { phoneNumber, userId } = await request.json()

    if (!phoneNumber || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate phone number format before proceeding
    const phoneValidation = smsService.validatePhoneNumber(phoneNumber)
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        {
          error: phoneValidation.error || "Invalid phone number format",
          details: "Phone number must be a valid Ethiopian number (251xxxxxxxxx)",
        },
        { status: 400 },
      )
    }

    // Generate a verification code
    const verificationCode = smsService.generateVerificationCode()

    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store the verification code in user metadata with the validated phone number
    const { error: updateError } = await supabaseServer.auth.admin.updateUserById(userId, {
      user_metadata: {
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt,
        phone_number: phoneValidation.formattedPhone, // Use the validated format
      },
    })

    if (updateError) {
      console.error("Error updating user metadata:", updateError)
      return NextResponse.json({ error: "Failed to store verification code" }, { status: 500 })
    }

    // Check if SMS service is configured
    const configStatus = smsService.getConfigurationStatus()
    if (!configStatus.isFullyConfigured) {
      console.log(`SMS service not fully configured:`, configStatus)
      console.log(`Verification code for ${phoneValidation.formattedPhone}: ${verificationCode}`)

      // Return the code for testing when SMS is not configured
      return NextResponse.json({
        success: true,
        testCode: verificationCode,
        message: "Verification code generated (SMS service not fully configured - showing for testing)",
        configStatus: configStatus,
      })
    }

    // Send SMS using AfroMessage API
    const smsResult = await smsService.sendVerificationCode(phoneValidation.formattedPhone!, verificationCode)

    if (!smsResult.success) {
      console.error("Failed to send SMS:", smsResult.message)

      // Still return success but include the test code for fallback
      return NextResponse.json({
        success: true,
        testCode: verificationCode,
        message: `SMS sending failed: ${smsResult.message}. Verification code provided for testing.`,
        smsError: smsResult.message,
      })
    }

    console.log(`Verification code sent successfully to ${phoneValidation.formattedPhone}`)

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully via SMS",
      phoneNumber: phoneValidation.formattedPhone,
    })
  } catch (error) {
    console.error("Error in send-verification:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
