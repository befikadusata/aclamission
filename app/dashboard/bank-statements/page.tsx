import { BankStatementUpload } from "@/components/bank-statement-upload"
import { BankTransactionsTable } from "@/components/bank-transactions-table"

export default function BankStatementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bank Statements</h1>
        <p className="text-muted-foreground">Upload and reconcile bank statements with pledges.</p>
      </div>

      <BankStatementUpload />
      <BankTransactionsTable />
    </div>
  )
}
