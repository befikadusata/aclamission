import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper function to normalize gender values
function normalizeGender(value: any): "male" | "female" | null {
  if (!value) return null

  const normalized = String(value).toLowerCase().trim()

  if (normalized === "male" || normalized === "m" || normalized === "man") {
    return "male"
  } else if (normalized === "female" || normalized === "f" || normalized === "woman") {
    return "female"
  }

  return null
}

// Helper function to normalize marital status
function normalizeMaritalStatus(value: any): "married" | "single" | null {
  if (!value) return null

  const normalized = String(value).toLowerCase().trim()

  if (normalized === "married" || normalized === "marriage") {
    return "married"
  } else if (normalized === "single" || normalized === "unmarried") {
    return "single"
  }

  return null
}

// Helper function to normalize status
function normalizeStatus(value: any): "active" | "inactive" | "on_leave" | null {
  if (!value) return "active" // Default to active

  const normalized = String(value).toLowerCase().trim()

  if (normalized === "active" || normalized === "a") {
    return "active"
  } else if (normalized === "inactive" || normalized === "i") {
    return "inactive"
  } else if (normalized === "on_leave" || normalized === "leave" || normalized === "on leave" || normalized === "l") {
    return "on_leave"
  }

  return "active" // Default to active if not recognized
}

export async function POST(request: Request) {
  try {
    // Create Supabase client with service role key for server operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    // Verify the user token
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const { missionaries, partnerId } = await request.json()

    if (!missionaries || !Array.isArray(missionaries) || missionaries.length === 0) {
      return NextResponse.json({ error: "No valid missionary data provided" }, { status: 400 })
    }

    if (!partnerId) {
      return NextResponse.json({ error: "Partner ID is required" }, { status: 400 })
    }

    // Validate partner exists
    const { data: partnerData, error: partnerError } = await supabase
      .from("partners")
      .select("id")
      .eq("id", partnerId)
      .single()

    if (partnerError || !partnerData) {
      return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 })
    }

    // Process and validate missionaries data
    const processedMissionaries = missionaries.map((m) => {
      // Normalize and validate fields with constraints
      return {
        name: m.name?.trim() || "",
        phone: m.phone || null,
        email: m.email || null,
        country_of_service: m.country_of_service || null,
        ministry_description: m.ministry_description || null,
        partner_id: partnerId,
        status: normalizeStatus(m.status),
        photo_url: m.photo_url || null,
        area_of_ministry: m.area_of_ministry?.trim() || "",
        agreement_id: m.agreement_id || null,
        gender: normalizeGender(m.gender),
        age: m.age ? Number(m.age) : null,
        marital_status: normalizeMaritalStatus(m.marital_status),
        number_of_family_members: m.number_of_family_members ? Number(m.number_of_family_members) : null,
        denomination: m.denomination || null,
        church: m.church || null,
        educational_status: m.educational_status || null,
        language: m.language || null,
        region: m.region || null,
        zone: m.zone || null,
        woreda: m.woreda || null,
        information_approved_by: m.information_approved_by || null,
        monthly_support_amount: m.monthly_support_amount ? Number(m.monthly_support_amount) : null,
      }
    })

    // Filter out missionaries without required fields
    const validMissionaries = processedMissionaries.filter(
      (m) => m.name && m.name.trim() !== "" && m.area_of_ministry && m.area_of_ministry.trim() !== "",
    )

    if (validMissionaries.length === 0) {
      return NextResponse.json({ error: "No valid missionary data with required fields" }, { status: 400 })
    }

    // Insert missionaries
    const { data, error } = await supabase.from("missionaries").insert(validMissionaries).select()

    if (error) {
      console.error("Error inserting missionaries:", error)
      return NextResponse.json({ error: `Failed to insert missionaries: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${validMissionaries.length} missionaries`,
      rowsImported: validMissionaries.length,
      duplicatesSkipped: missionaries.length - validMissionaries.length,
    })
  } catch (error: any) {
    console.error("Missionary upload error:", error)
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500 })
  }
}
