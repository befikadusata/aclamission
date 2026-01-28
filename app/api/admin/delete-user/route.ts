import { type NextRequest, NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function DELETE(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    console.log("[v0] Delete user request for userId:", userId, "email:", email)

    if (!userId && !email) {
      return NextResponse.json({ error: "userId or email is required" }, { status: 400 })
    }

    // If we have userId, use it directly
    let userIdToDelete = userId

    // If only email is provided, we need to find the user by email from auth.users
    if (!userIdToDelete && email) {
      console.log("[v0] Looking up user by email:", email)
      // Query auth users to find the one with matching email
      const { data: authUsers, error: authError } = await supabaseServer.auth.admin.listUsers()

      if (authError) {
        console.error("[v0] Error listing auth users:", authError)
        return NextResponse.json({ error: "Failed to list auth users" }, { status: 500 })
      }

      const authUser = authUsers.users.find((u) => u.email === email)
      if (!authUser) {
        console.error("[v0] Auth user not found with email:", email)
        return NextResponse.json({ error: "User not found in auth" }, { status: 404 })
      }

      userIdToDelete = authUser.id
      console.log("[v0] Found auth user with ID:", userIdToDelete)
    }

    // Delete related data first
    const deletions = []

    // Delete pledges
    console.log("[v0] Deleting pledges for user:", userIdToDelete)
    const { error: pledgesError } = await supabaseServer.from("pledges").delete().eq("individual_id", userIdToDelete)

    if (pledgesError) {
      console.warn("[v0] Error deleting pledges:", pledgesError)
    } else {
      deletions.push("pledges")
    }

    // Delete commitments
    console.log("[v0] Deleting commitments for user:", userIdToDelete)
    const { error: commitmentsError } = await supabaseServer.from("commitments").delete().eq("user_id", userIdToDelete)

    if (commitmentsError) {
      console.warn("[v0] Error deleting commitments:", commitmentsError)
    } else {
      deletions.push("commitments")
    }

    // Delete notifications
    console.log("[v0] Deleting notifications for user:", userIdToDelete)
    const { error: notificationsError } = await supabaseServer.from("notifications").delete().eq("user_id", userIdToDelete)

    if (notificationsError) {
      console.warn("[v0] Error deleting notifications:", notificationsError)
    } else {
      deletions.push("notifications")
    }

    // Delete from profiles table
    console.log("[v0] Deleting profile with ID:", userIdToDelete)
    const { error: profileDeleteError } = await supabaseServer.from("profiles").delete().eq("id", userIdToDelete)

    if (profileDeleteError) {
      console.error("[v0] Failed to delete profile:", profileDeleteError)
      throw new Error(`Failed to delete profile: ${profileDeleteError.message}`)
    }

    deletions.push("profile")
    console.log("[v0] Profile deleted successfully")

    // Delete from auth.users table using admin API
    console.log("[v0] Deleting auth user with ID:", userIdToDelete)
    const { error: authDeleteError } = await supabaseServer.auth.admin.deleteUser(userIdToDelete)

    if (authDeleteError) {
      console.error("[v0] Error deleting from auth.users:", authDeleteError)
      // Don't throw here as the profile is already deleted, but log the error
    } else {
      deletions.push("auth_user")
      console.log("[v0] Auth user deleted successfully")
    }

    console.log("[v0] Delete completed for user", userIdToDelete, "- deleted:", deletions)

    return NextResponse.json({
      success: true,
      message: `User has been successfully deleted`,
      deletedData: deletions,
      userId: userIdToDelete,
    })
  } catch (error: any) {
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 })
  }
}
