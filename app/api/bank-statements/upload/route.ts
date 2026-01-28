import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import Papa from "papaparse"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file type
    const fileType = file.name.split(".").pop()?.toLowerCase()
    if (fileType !== "csv" && fileType !== "xlsx" && fileType !== "xls") {
      return NextResponse.json({ error: "Invalid file type. Only CSV and Excel files are supported." }, { status: 400 })
    }

    // For now, we'll only handle CSV files
    if (fileType !== "csv") {
      return NextResponse.json({ error: "Excel file processing is not implemented yet." }, { status: 400 })
    }

    // Read the file content
    const fileContent = await file.text()

    // Parse CSV
    const { data, errors } = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (errors.length > 0) {
      return NextResponse.json({ error: `CSV parsing error: ${errors[0].message}` }, { status: 400 })
    }

    // Get existing transaction references to check for duplicates
    const { data: existingTransactions, error: fetchError } = await supabaseServer
      .from("bank_transactions")
      .select("transaction_reference")

    if (fetchError) {
      return NextResponse.json(
        { error: `Error checking existing transactions: ${fetchError.message}` },
        { status: 500 },
      )
    }

    const existingReferences = new Set(existingTransactions?.map((t) => t.transaction_reference).filter(Boolean) || [])

    // Process the data and filter out duplicates
    const transactions = []
    const duplicates = []

    for (const row of data as any[]) {
      // Map CSV columns to database fields based on the updated schema
      const transactionReference =
        row["Transaction Reference"] || row["TRANSACTION REFERENCE"] || row["Reference"] || row["REFERENCE"] || ""

      // Check for duplicate
      if (transactionReference && existingReferences.has(transactionReference)) {
        duplicates.push(transactionReference)
        continue
      }

      const transaction = {
        value_date: parseDate(row["Value Date"] || row["VALUE DATE"] || row["Value date"] || ""),
        transaction_type: row["Transaction Type"] || row["TRANSACTION TYPE"] || row["Transaction type"] || "",
        transaction_reference: transactionReference,
        posting_date: parseDate(row["Posting Date"] || row["POSTING DATE"] || row["Posting date"] || ""),
        debit_amount: parseAmount(row["Debit"] || row["DEBIT"] || row["Withdrawal"] || row["WITHDRAWAL"] || "0"),
        credit_amount: parseAmount(row["Credit"] || row["CREDIT"] || row["Deposit"] || row["DEPOSIT"] || "0"),
        balance: parseAmount(row["Balance"] || row["BALANCE"] || "0"),
        description: row["Narrative"] || row["NARRATIVE"] || row["Description"] || row["DESCRIPTION"] || "",
        // Updated column names to match the corrected schema
        benificiary_ac:
          row["Beneficiary AC"] || row["BENEFICIARY AC"] || row["Beneficiary Account"] || row["Benificiary AC"] || "",
        benificiary_name: row["Beneficiary Name"] || row["BENEFICIARY NAME"] || row["Benificiary Name"] || "",
        transaction_date: parseDate(
          row["Transaction Date"] || row["TRANSACTION DATE"] || row["Date"] || row["DATE"] || "",
        ),
        branch_code: row["Branch Code"] || row["BRANCH CODE"] || "",
        account_number: row["Account Number"] || row["ACCOUNT NUMBER"] || "",
        reconciled: false,
        notes: "",
        receipt_number: null, // Initialize as null
        pledge_id: null, // Initialize as null
        outgoing_id: null, // Initialize as null
      }

      transactions.push(transaction)
    }

    let insertedCount = 0
    let insertError = null

    // Insert transactions into the database if there are any
    if (transactions.length > 0) {
      const { error } = await supabaseServer.from("bank_transactions").insert(transactions)
      if (error) {
        console.error("Database insertion error:", error)
        insertError = error.message
      } else {
        insertedCount = transactions.length
      }
    }

    // Prepare response message
    let message = `Successfully imported ${insertedCount} transactions.`
    if (duplicates.length > 0) {
      message += ` Skipped ${duplicates.length} duplicate transactions.`
    }
    if (insertError) {
      message = `Error inserting transactions: ${insertError}`
    }

    return NextResponse.json({
      success: !insertError,
      rowsImported: insertedCount,
      duplicatesSkipped: duplicates.length,
      message,
      duplicateReferences: duplicates.slice(0, 10), // Show first 10 duplicates
    })
  } catch (error: any) {
    console.error("Upload processing error:", error)
    return NextResponse.json({ error: `Error processing upload: ${error.message}` }, { status: 500 })
  }
}

// Helper function to parse dates from various formats - FIXED for timezone issues
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null

  // Clean the date string
  const cleanedDateStr = dateStr.trim()

  // Try to parse the date using different formats
  let parsedDate: Date | null = null

  // Try DD/MM/YYYY format first (most common in bank statements)
  const ddmmyyyyPattern = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/
  const ddmmyyyyMatch = cleanedDateStr.match(ddmmyyyyPattern)

  if (ddmmyyyyMatch) {
    const day = Number.parseInt(ddmmyyyyMatch[1], 10)
    const month = Number.parseInt(ddmmyyyyMatch[2], 10) - 1 // Months are 0-indexed in JS
    const year = Number.parseInt(ddmmyyyyMatch[3], 10)

    // Create date in local timezone to avoid timezone conversion issues
    parsedDate = new Date(year, month, day)
  } else {
    // Try other date formats
    const attemptedDate = new Date(cleanedDateStr)
    if (!isNaN(attemptedDate.getTime())) {
      // If the date was parsed successfully, create a new date in local timezone
      // to avoid timezone offset issues
      parsedDate = new Date(attemptedDate.getFullYear(), attemptedDate.getMonth(), attemptedDate.getDate())
    }
  }

  if (parsedDate && !isNaN(parsedDate.getTime())) {
    // Format as YYYY-MM-DD in local timezone to avoid UTC conversion
    const year = parsedDate.getFullYear()
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0")
    const day = String(parsedDate.getDate()).padStart(2, "0")

    return `${year}-${month}-${day}`
  }

  return null
}

// Helper function to parse amounts
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0

  // Remove currency symbols, commas, and other non-numeric characters except decimal point
  const cleanedStr = amountStr.replace(/[^\d.-]/g, "")
  return Number.parseFloat(cleanedStr) || 0
}
