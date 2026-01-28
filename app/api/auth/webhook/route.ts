import { createUserHook } from "@/lib/hooks/create-user-hook"
import { NextResponse } from "next/server"

// This endpoint will be called by Supabase Auth when certain events happen
export async function POST(request: Request) {
  const payload = await request.json()

  // Handle different auth events
  const eventType = payload.type

  if (eventType === "SIGNED_UP") {
    // Create a profile for the new user
    await createUserHook(payload)
  }

  return NextResponse.json({ message: "Webhook processed" })
}
