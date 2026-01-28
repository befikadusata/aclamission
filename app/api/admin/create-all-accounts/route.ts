import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { emailService } from "@/lib/services/email-service"

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

export async function POST(request: Request) {
  try {
    // Get all individuals with email addresses who don't have user accounts
    const { data: individuals, error: queryError } = await supabaseServer
      .from("individuals")
      .select(`
        id, 
        name, 
        email, 
        phone_number,
        user_id
      `)
      .is("user_id", null)
      .not("email", "is", null)
      .not("email", "eq", "")

    if (queryError) {
      console.error("Error querying individuals:", queryError)
      return NextResponse.json({ success: false, error: queryError.message }, { status: 500 })
    }

    if (!individuals || individuals.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No eligible individuals found",
        processed: 0,
        created: 0,
        errors: 0,
        skipped: 0,
        results: [],
      })
    }

    // Get all existing auth users to check for duplicates
    const {
      data: { users: existingUsers },
      error: authError,
    } = await supabaseServer.auth.admin.listUsers()

    if (authError) {
      console.error("Error fetching existing users:", authError)
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 })
    }

    // Create a set of existing emails for faster lookup
    const existingEmails = new Set(existingUsers.map((user) => user.email?.toLowerCase()))

    let created = 0
    let errors = 0
    let skipped = 0
    const results = []
    let processed = 0

    // Process each individual
    for (const individual of individuals) {
      processed++

      // Skip if no email
      if (!individual.email) {
        skipped++
        results.push({
          email: "No email provided",
          success: false,
          error: "No email address",
        })
        continue
      }

      // Validate email format
      if (!EMAIL_REGEX.test(individual.email)) {
        skipped++
        results.push({
          email: individual.email,
          success: false,
          error: "Invalid email format",
        })
        continue
      }

      // Check for duplicate email
      if (existingEmails.has(individual.email.toLowerCase())) {
        skipped++
        results.push({
          email: individual.email,
          success: false,
          error: "Email already exists",
        })
        continue
      }

      try {
        // Create user with Supabase Auth API
        const { data: user, error: createError } = await supabaseServer.auth.admin.createUser({
          email: individual.email,
          password: "123456",
          email_confirm: false, // Require email verification
          user_metadata: {
            full_name: individual.name,
            phone_number: individual.phone_number || "",
          },
        })

        if (createError) {
          console.error(`Error creating account for ${individual.email}:`, createError)
          errors++
          results.push({
            email: individual.email,
            success: false,
            error: createError.message,
          })
          continue
        }

        if (!user.user) {
          errors++
          results.push({
            email: individual.email,
            success: false,
            error: "User creation returned no user",
          })
          continue
        }

        // Update profile with supporter role
        const { error: profileError } = await supabaseServer
          .from("profiles")
          .update({
            role: "supporter",
            user_type: "supporter",
            full_name: individual.name,
            phone_number: individual.phone_number || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.user.id)

        if (profileError) {
          console.error(`Error updating profile for ${individual.email}:`, profileError)
        }

        // Link user to individual
        const { error: linkError } = await supabaseServer
          .from("individuals")
          .update({ user_id: user.user.id })
          .eq("id", individual.id)

        if (linkError) {
          console.error(`Error linking user to individual ${individual.email}:`, linkError)
        }

        // Generate verification token
        const verificationToken = emailService.generateVerificationToken()
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Store verification token in database
        await supabaseServer
          .from("profiles")
          .update({
            email_verification_token: verificationToken,
            email_verification_expires_at: expiresAt.toISOString(),
          })
          .eq("id", user.user.id)

        // Send verification email
        await emailService.sendVerificationEmail(individual.email, individual.name, verificationToken)

        created++
        results.push({
          email: individual.email,
          success: true,
          password: "123456",
        })
      } catch (err: any) {
        console.error(`Error processing ${individual.email}:`, err)
        errors++
        results.push({
          email: individual.email,
          success: false,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      created,
      errors,
      skipped,
      results,
    })
  } catch (error: any) {
    console.error("Error in create-all-accounts:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
