"use server"

import { supabaseServer } from "@/lib/supabase-server"
import { emailService } from "@/lib/services/email-service"
import { createSupporterAccount } from "./auth-actions"
import { generateRandomPassword } from "@/lib/utils/password-utils"

/**
 * Creates user accounts for all individuals with pledges who don't have accounts yet
 */
export async function createAccountsForExistingPledges() {
  try {
    // Get all individuals who have pledges but no user account
    const { data: individuals, error: queryError } = await supabaseServer
      .from("individuals")
      .select(`
        id, 
        name, 
        email, 
        phone_number,
        user_id,
        pledges(id)
      `)
      .is("user_id", null)
      .not("email", "is", null)
      .not("pledges", "is", null)

    if (queryError) {
      console.error("Error querying individuals:", queryError)
      return { success: false, error: queryError.message, processed: 0, created: 0 }
    }

    if (!individuals || individuals.length === 0) {
      return { success: true, message: "No eligible individuals found", processed: 0, created: 0 }
    }

    let created = 0
    let errors = 0
    const results = []

    // Process each individual
    for (const individual of individuals) {
      if (!individual.email) continue

      try {
        // Generate a random password
        const tempPassword = generateRandomPassword()

        // Create the supporter account
        const { error, user } = await createSupporterAccount({
          email: individual.email,
          password: tempPassword,
          fullName: individual.name,
          phoneNumber: individual.phone_number || "",
        })

        if (error) {
          console.error(`Error creating account for ${individual.email}:`, error)
          errors++
          results.push({
            email: individual.email,
            success: false,
            error: error.message,
          })
          continue
        }

        // Send welcome email with password reset link
        const verificationToken = emailService.generateVerificationToken()
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Store verification token in database
        await supabaseServer
          .from("profiles")
          .update({
            email_verification_token: verificationToken,
            email_verification_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user?.id)

        // Send verification email
        await emailService.sendVerificationEmail(individual.email, individual.name, verificationToken)

        created++
        results.push({
          email: individual.email,
          success: true,
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

    return {
      success: true,
      processed: individuals.length,
      created,
      errors,
      results,
    }
  } catch (error: any) {
    console.error("Error in createAccountsForExistingPledges:", error)
    return { success: false, error: error.message, processed: 0, created: 0 }
  }
}

/**
 * Creates user accounts for ALL individuals with email addresses
 * Uses email as username and a fixed password of "123456"
 */
export async function createAccountsForAllIndividuals() {
  try {
    // Get all individuals who have email addresses but no user account
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

    if (queryError) {
      console.error("Error querying individuals:", queryError)
      return { success: false, error: queryError.message, processed: 0, created: 0 }
    }

    if (!individuals || individuals.length === 0) {
      return { success: true, message: "No eligible individuals found", processed: 0, created: 0 }
    }

    let created = 0
    let errors = 0
    const results = []

    // Process each individual
    for (const individual of individuals) {
      if (!individual.email) continue

      try {
        // Use fixed password "123456"
        const fixedPassword = "123456"

        // Create the supporter account
        const { error, user } = await createSupporterAccount({
          email: individual.email,
          password: fixedPassword,
          fullName: individual.name,
          phoneNumber: individual.phone_number || "",
        })

        if (error) {
          console.error(`Error creating account for ${individual.email}:`, error)
          errors++
          results.push({
            email: individual.email,
            success: false,
            error: error.message,
          })
          continue
        }

        // Link the user account to the individual
        if (user) {
          const { error: updateError } = await supabaseServer
            .from("individuals")
            .update({ user_id: user.id })
            .eq("id", individual.id)

          if (updateError) {
            console.error(`Error linking user to individual ${individual.email}:`, updateError)
          }
        }

        // Send welcome email with verification link
        const verificationToken = emailService.generateVerificationToken()
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        // Store verification token in database
        await supabaseServer
          .from("profiles")
          .update({
            email_verification_token: verificationToken,
            email_verification_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", user?.id)

        // Send verification email
        await emailService.sendVerificationEmail(individual.email, individual.name, verificationToken)

        created++
        results.push({
          email: individual.email,
          success: true,
          password: fixedPassword, // Include password in results for admin reference
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

    return {
      success: true,
      processed: individuals.length,
      created,
      errors,
      results,
    }
  } catch (error: any) {
    console.error("Error in createAccountsForAllIndividuals:", error)
    return { success: false, error: error.message, processed: 0, created: 0 }
  }
}

/**
 * Creates a user account for a specific individual
 */
export async function createAccountForIndividual(individualId: string) {
  try {
    // Get the individual
    const { data: individual, error: queryError } = await supabaseServer
      .from("individuals")
      .select("id, name, email, phone_number, user_id")
      .eq("id", individualId)
      .single()

    if (queryError) {
      console.error("Error querying individual:", queryError)
      return { success: false, error: queryError.message }
    }

    if (!individual) {
      return { success: false, error: "Individual not found" }
    }

    if (individual.user_id) {
      return { success: false, error: "Individual already has a user account" }
    }

    if (!individual.email) {
      return { success: false, error: "Individual does not have an email address" }
    }

    // Generate a random password
    const tempPassword = generateRandomPassword()

    // Create the supporter account
    const { error, user } = await createSupporterAccount({
      email: individual.email,
      password: tempPassword,
      fullName: individual.name,
      phoneNumber: individual.phone_number || "",
    })

    if (error) {
      console.error(`Error creating account for ${individual.email}:`, error)
      return { success: false, error: error.message }
    }

    // Send welcome email with password reset link
    const verificationToken = emailService.generateVerificationToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store verification token in database
    await supabaseServer
      .from("profiles")
      .update({
        email_verification_token: verificationToken,
        email_verification_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user?.id)

    // Send verification email
    await emailService.sendVerificationEmail(individual.email, individual.name, verificationToken)

    return { success: true, user }
  } catch (error: any) {
    console.error("Error in createAccountForIndividual:", error)
    return { success: false, error: error.message }
  }
}
