import { OutgoingsSummaryCards } from "@/components/outgoings-summary-cards"
import { OutgoingsTable } from "@/components/outgoings-table"

export default function OutgoingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Outgoing Payments</h1>
          <p className="text-muted-foreground">
            Manage all financial payments made by ACLA Missions including missionary support and operational expenses.
          </p>
        </div>
      </div>

      <OutgoingsSummaryCards />
      <OutgoingsTable />
    </div>
  )
}
