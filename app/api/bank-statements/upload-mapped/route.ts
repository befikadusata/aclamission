import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    const { transactions } = await request.json()

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: "Invalid transaction data" }, { status: 400 })
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No transactions to import" }, { status: 400 })
    }

    // Insert transactions into the database
    const { error } = await supabaseServer.from("bank_transactions").insert(transactions)

    if (error) {
      console.error("Database insertion error:", error)
      return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, rowsImported: transactions.length })
  } catch (error: any) {
    console.error("Upload processing error:", error)
    return NextResponse.json({ error: `Error processing upload: ${error.message}` }, { status: 500 })
  }
}
