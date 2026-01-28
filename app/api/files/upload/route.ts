import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const partnerId = formData.get("partnerId") as string
    const agreementId = formData.get("agreementId") as string
    const uploadType = formData.get("uploadType") as string
    const description = formData.get("description") as string
    const amount = formData.get("amount") as string
    const date = formData.get("date") as string

    if (!file || !partnerId || !uploadType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 })
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size too large (max 10MB)" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split(".").pop()
    const fileName = `${uploadType}_${partnerId}_${timestamp}.${fileExtension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log("Uploading file:", fileName, "to bucket: documents")

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from("documents")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json(
        {
          error: `Failed to upload file: ${uploadError.message}`,
          details: uploadError,
        },
        { status: 500 },
      )
    }

    console.log("File uploaded successfully:", uploadData)

    // Get public URL
    const { data: urlData } = supabaseServer.storage.from("documents").getPublicUrl(fileName)

    console.log("Public URL generated:", urlData.publicUrl)

    // Handle agreement-based uploads
    if (agreementId) {
      try {
        if (uploadType === "receipt" && amount) {
          // Create or update disbursement record with receipt
          const { data: disbursementData, error: disbursementError } = await supabaseServer
            .from("disbursements")
            .insert({
              agreement_id: agreementId,
              date: date,
              amount: Number.parseFloat(amount),
              receipt_url: urlData.publicUrl,
              notes: description || null,
              submitted_at: new Date().toISOString(),
            })
            .select()

          if (disbursementError) {
            console.error("Disbursement creation error:", disbursementError)
            // Don't fail the upload, just log the error
          } else {
            console.log("Disbursement created:", disbursementData)
          }
        } else if (uploadType === "report") {
          // For reports, update existing disbursement or create a new one
          const { data: existingDisbursements } = await supabaseServer
            .from("disbursements")
            .select("*")
            .eq("agreement_id", agreementId)
            .is("report_url", null)
            .limit(1)

          if (existingDisbursements && existingDisbursements.length > 0) {
            // Update existing disbursement with report
            const { error: updateError } = await supabaseServer
              .from("disbursements")
              .update({
                report_url: urlData.publicUrl,
                notes: description
                  ? `${existingDisbursements[0].notes || ""}\nReport: ${description}`
                  : existingDisbursements[0].notes,
              })
              .eq("id", existingDisbursements[0].id)

            if (updateError) {
              console.error("Disbursement update error:", updateError)
            }
          } else {
            // Create new disbursement for report
            const { error: disbursementError } = await supabaseServer.from("disbursements").insert({
              agreement_id: agreementId,
              date: date,
              amount: 0, // Reports don't have amounts
              report_url: urlData.publicUrl,
              notes: description || null,
              submitted_at: new Date().toISOString(),
            })

            if (disbursementError) {
              console.error("Disbursement creation error:", disbursementError)
            }
          }
        }
      } catch (error) {
        console.error("Error handling agreement-based upload:", error)
        // Don't fail the upload, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: fileName,
      message: `${uploadType === "receipt" ? "Receipt" : "Report"} uploaded successfully`,
    })
  } catch (error: any) {
    console.error("File upload error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
