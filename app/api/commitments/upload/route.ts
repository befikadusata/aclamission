import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const pledgeId = formData.get("pledgeId") as string
    const uploadType = formData.get("uploadType") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${uploadType}_${pledgeId}_${Date.now()}.${fileExt}`
    const filePath = `commitments/${fileName}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage.from("commitments").upload(filePath, buffer, {
      contentType: file.type,
    })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("commitments").getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
