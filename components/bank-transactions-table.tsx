"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { Database } from "@/lib/supabase"
import {
  ArrowUpDown,
  Edit2,
  Download,
  Printer,
  Filter,
  X,
  Check,
  Eye,
  EyeOff,
  Settings,
  CalendarIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// Define the BankTransaction type with updated pledge structure
type BankTransaction = Database["public"]["Tables"]["bank_transactions"]["Row"] & {
  pledge?: {
    individual?: {
      name: string
    }
  }
  outgoing?: {
    title: string
  }
}

type SortField = "value_date" | "debit_amount" | "credit_amount" | "balance" | "transaction_date"
type SortDirection = "asc" | "desc"

export function BankTransactionsTable() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [pledges, setPledges] = useState<any[]>([])
  const [outgoings, setOutgoings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField>("value_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact")
  const [removingDuplicates, setRemovingDuplicates] = useState(false)
  const [totalTransactionCount, setTotalTransactionCount] = useState(0)
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)

  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState({
    value_date: true,
    transaction_type: true,
    transaction_reference: true,
    posting_date: false,
    debit_amount: true,
    credit_amount: true,
    balance: true,
    description: true,
    benificiary_ac: true,
    benificiary_name: true,
    transaction_date: false,
    receipt_number: true,
    status: true,
    linking: true,
  })

  // Editing states
  const [editingReceipt, setEditingReceipt] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState<string | null>(null)
  const [receiptInput, setReceiptInput] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null)

  // Filter states
  const [filters, setFilters] = useState({
    transactionReference: "",
    narrative: "",
    benificiaryAc: "",
    benificiaryName: "",
    receiptNumber: "",
  })

  const { toast } = useToast()

  // Listen for refresh events from upload
  useEffect(() => {
    const handleRefresh = () => {
      fetchData()
    }

    window.addEventListener("refresh-transactions", handleRefresh)
    return () => {
      window.removeEventListener("refresh-transactions", handleRefresh)
    }
  }, [])

  // Filter and sort transactions
  const getFilteredAndSortedTransactions = () => {
    const filtered = transactions.filter((transaction) => {
      // Date range filter
      if (startDate || endDate) {
        const transactionDate = new Date(transaction.value_date)
        if (startDate && transactionDate < startDate) {
          return false
        }
        if (endDate && transactionDate > endDate) {
          return false
        }
      }

      // Text filters
      if (
        filters.transactionReference &&
        !transaction.transaction_reference?.toLowerCase().includes(filters.transactionReference.toLowerCase())
      ) {
        return false
      }
      if (filters.narrative && !transaction.description?.toLowerCase().includes(filters.narrative.toLowerCase())) {
        return false
      }
      if (
        filters.benificiaryAc &&
        !transaction.benificiary_ac?.toLowerCase().includes(filters.benificiaryAc.toLowerCase())
      ) {
        return false
      }
      if (
        filters.benificiaryName &&
        !transaction.benificiary_name?.toLowerCase().includes(filters.benificiaryName.toLowerCase())
      ) {
        return false
      }
      if (
        filters.receiptNumber &&
        !transaction.receipt_number?.toLowerCase().includes(filters.receiptNumber.toLowerCase())
      ) {
        return false
      }

      return true
    })

    // Sort transactions
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle numeric fields
      if (["debit_amount", "credit_amount", "balance"].includes(sortField)) {
        aValue = Number.parseFloat(aValue || "0")
        bValue = Number.parseFloat(bValue || "0")
      }

      // Handle date fields
      if (["value_date", "transaction_date"].includes(sortField)) {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }

  const filteredTransactions = getFilteredAndSortedTransactions()

  // Calculate summary from all transactions (not just filtered)
  const summary = {
    totalDebit: totalDebit,
    totalCredit: totalCredit,
    count: totalTransactionCount,
    filteredCount: filteredTransactions.length,
  }

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when filters change
  }, [filters, startDate, endDate, sortField, sortDirection])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Function to fetch all records in batches
      const fetchAllRecords = async (table: string, select = "*", orderBy?: string) => {
        let allRecords: any[] = []
        let from = 0
        const batchSize = 1000

        while (true) {
          let query = supabase
            .from(table)
            .select(select)
            .range(from, from + batchSize - 1)

          if (orderBy) {
            query = query.order(orderBy, { ascending: false })
          }

          const { data: batch, error } = await query

          if (error) {
            throw error
          }

          if (!batch || batch.length === 0) {
            break
          }

          allRecords = [...allRecords, ...batch]

          // If we got less than batchSize, we've reached the end
          if (batch.length < batchSize) {
            break
          }

          from += batchSize
        }

        return allRecords
      }

      // Fetch ALL transactions
      console.log("Fetching all transactions...")
      const allTransactions = await fetchAllRecords("bank_transactions", "*", "transaction_date")
      console.log(`Fetched ${allTransactions.length} total transactions`)

      // Calculate totals from ALL transactions
      const calculatedTotalDebit = allTransactions.reduce(
        (sum, record) => sum + Number.parseFloat(record.debit_amount || "0"),
        0,
      )
      const calculatedTotalCredit = allTransactions.reduce(
        (sum, record) => sum + Number.parseFloat(record.credit_amount || "0"),
        0,
      )

      console.log(`Total Debit: ${calculatedTotalDebit}`)
      console.log(`Total Credit: ${calculatedTotalCredit}`)

      setTotalDebit(calculatedTotalDebit)
      setTotalCredit(calculatedTotalCredit)
      setTotalTransactionCount(allTransactions.length)

      // Fetch pledges with individuals separately
      const { data: pledgesData, error: pledgesError } = await supabase.from("pledges").select(`
        id,
        missionaries_committed,
        amount_per_frequency,
        frequency,
        special_support_amount,
        special_support_frequency,
        in_kind_support,
        yearly_missionary_support,
        yearly_special_support,
        individual_id,
        individuals!inner(name)
      `)

      // Fetch outgoings separately
      const { data: outgoingsData, error: outgoingsError } = await supabase
        .from("outgoings")
        .select("id, title")
        .in("status", ["approved", "finalized"])

      if (pledgesError) {
        console.error("Pledges error:", pledgesError)
      }

      if (outgoingsError) {
        console.error("Outgoings error:", outgoingsError)
      }

      // Create lookup maps for pledges and outgoings
      const pledgeMap = new Map()
      if (pledgesData) {
        pledgesData.forEach((pledge) => {
          pledgeMap.set(pledge.id, {
            individual: { name: pledge.individuals.name },
            pledge_type: pledge.missionaries_committed,
          })
        })
      }

      const outgoingMap = new Map()
      if (outgoingsData) {
        outgoingsData.forEach((outgoing) => {
          outgoingMap.set(outgoing.id, { title: outgoing.title })
        })
      }

      // Enhance transactions with pledge and outgoing data
      const enhancedTransactions = allTransactions.map((transaction) => ({
        ...transaction,
        pledge: transaction.pledge_id ? pledgeMap.get(transaction.pledge_id) : null,
        outgoing: transaction.outgoing_id ? outgoingMap.get(transaction.outgoing_id) : null,
      }))

      setTransactions(enhancedTransactions)
      setPledges(pledgesData || [])
      setOutgoings(outgoingsData || [])
    } catch (error: any) {
      console.error("Fetch error:", error)
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      transactionReference: "",
      narrative: "",
      benificiaryAc: "",
      benificiaryName: "",
      receiptNumber: "",
    })
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const removeDuplicates = async () => {
    try {
      setRemovingDuplicates(true)

      // Fetch ALL transactions without any limits to check for duplicates
      let allTransactions: any[] = []
      let from = 0
      const batchSize = 1000

      // Fetch all transactions in batches to avoid limits
      while (true) {
        const { data: batch, error: fetchError } = await supabase
          .from("bank_transactions")
          .select("id, transaction_reference, balance, created_at")
          .order("created_at", { ascending: true })
          .range(from, from + batchSize - 1)

        if (fetchError) {
          toast({
            title: "Error",
            description: `Failed to fetch transactions: ${fetchError.message}`,
            variant: "destructive",
          })
          return
        }

        if (!batch || batch.length === 0) {
          break
        }

        allTransactions = [...allTransactions, ...batch]

        // If we got less than batchSize, we've reached the end
        if (batch.length < batchSize) {
          break
        }

        from += batchSize
      }

      console.log(`Total transactions fetched for duplicate check: ${allTransactions.length}`)

      if (allTransactions.length === 0) {
        toast({
          title: "No Transactions",
          description: "No transactions found to check for duplicates.",
        })
        return
      }

      // Group transactions by transaction reference
      const transactionGroups = new Map()
      const duplicateIds: string[] = []
      const duplicateDetails: any[] = []

      allTransactions.forEach((transaction) => {
        // Skip transactions without transaction reference
        if (
          !transaction.transaction_reference ||
          transaction.transaction_reference.trim() === "" ||
          transaction.transaction_reference.toLowerCase() === "null" ||
          transaction.transaction_reference.toLowerCase() === "undefined"
        ) {
          return
        }

        // Skip transactions without balance
        if (transaction.balance === null || transaction.balance === undefined) {
          return
        }

        // Create a composite key using both transaction reference and balance
        const transactionRef = transaction.transaction_reference.toString().trim().toLowerCase().replace(/\s+/g, " ")
        const balance = Number.parseFloat(transaction.balance.toString()).toFixed(2) // Normalize balance to 2 decimal places
        const compositeKey = `${transactionRef}|||${balance}` // Use ||| as separator

        if (transactionGroups.has(compositeKey)) {
          // This is a duplicate - add to removal list
          duplicateIds.push(transaction.id)
          duplicateDetails.push({
            id: transaction.id,
            transaction_reference: transaction.transaction_reference,
            balance: transaction.balance,
            created_at: transaction.created_at,
            composite_key: compositeKey,
          })
          console.log("Duplicate found:", {
            id: transaction.id,
            transaction_reference: transaction.transaction_reference,
            balance: transaction.balance,
            composite_key: compositeKey,
            created_at: transaction.created_at,
          })
        } else {
          // First occurrence - keep it
          transactionGroups.set(compositeKey, transaction)
          console.log("Original kept:", {
            id: transaction.id,
            transaction_reference: transaction.transaction_reference,
            balance: transaction.balance,
            composite_key: compositeKey,
            created_at: transaction.created_at,
          })
        }
      })

      console.log(`Found ${duplicateIds.length} duplicates out of ${allTransactions.length} total transactions`)
      console.log("Duplicate details:", duplicateDetails)

      if (duplicateIds.length === 0) {
        toast({
          title: "No Duplicates Found",
          description: `No duplicate transactions were found based on Transaction Reference and Balance. Checked ${allTransactions.length} total transactions.`,
        })
        return
      }

      // Show detailed confirmation with more information
      const confirmed = window.confirm(
        `Found ${duplicateIds.length} duplicate transaction(s) based on Transaction Reference AND Balance.\n\n` +
          `Total transactions checked: ${allTransactions.length}\n` +
          `Unique transaction reference + balance combinations: ${transactionGroups.size}\n\n` +
          `The oldest record for each Transaction Reference + Balance combination will be kept, and newer duplicates will be removed.\n\n` +
          `Are you sure you want to remove them? This action cannot be undone.`,
      )

      if (!confirmed) {
        return
      }

      // Remove duplicates from database in batches
      const batchDeleteSize = 100
      let deletedCount = 0

      for (let i = 0; i < duplicateIds.length; i += batchDeleteSize) {
        const batch = duplicateIds.slice(i, i + batchDeleteSize)

        const { error: deleteError } = await supabase.from("bank_transactions").delete().in("id", batch)

        if (deleteError) {
          toast({
            title: "Error",
            description: `Failed to remove duplicates: ${deleteError.message}`,
            variant: "destructive",
          })
          return
        }

        deletedCount += batch.length
        console.log(`Deleted batch ${Math.floor(i / batchDeleteSize) + 1}: ${batch.length} records`)
      }

      toast({
        title: "Duplicates Removed",
        description: `Successfully removed ${deletedCount} duplicate transaction(s) based on Transaction Reference and Balance.`,
      })

      fetchData() // Refresh the data
    } catch (error: any) {
      console.error("Remove duplicates error:", error)
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setRemovingDuplicates(false)
    }
  }

  const handleSaveReceipt = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from("bank_transactions")
        .update({ receipt_number: receiptInput })
        .eq("id", transactionId)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update receipt number",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Receipt Updated",
          description: "Receipt number has been updated successfully.",
        })
        setEditingReceipt(null)
        setReceiptInput("")
        fetchData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleLinkTransaction = async (transactionId: string, linkType: "pledge" | "outgoing", linkId: string) => {
    try {
      const transaction = transactions.find((t) => t.id === transactionId)
      if (!transaction) return

      const amount =
        linkType === "pledge"
          ? Number.parseFloat(transaction.credit_amount || "0")
          : Number.parseFloat(transaction.debit_amount || "0")

      // Handle unlinking
      if (linkId === "unlink") {
        const updateData =
          linkType === "pledge" ? { pledge_id: null, reconciled: false } : { outgoing_id: null, reconciled: false }

        const { error } = await supabase.from("bank_transactions").update(updateData).eq("id", transactionId)

        if (!error) {
          toast({
            title: "Transaction Unlinked",
            description: `Transaction has been unlinked from ${linkType}.`,
          })
          setEditingLink(null)
          fetchData()
        }
        return
      }

      // Handle linking
      const updateData =
        linkType === "pledge" ? { pledge_id: linkId, reconciled: true } : { outgoing_id: linkId, reconciled: true }

      const { error } = await supabase.from("bank_transactions").update(updateData).eq("id", transactionId)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to link transaction",
          variant: "destructive",
        })
      } else {
        // Update related records
        if (linkType === "pledge") {
          await updatePledgeContribution(linkId, amount)
        } else {
          await updateOutgoingPayment(linkId, amount)
        }

        toast({
          title: "Transaction Linked",
          description: `Transaction has been linked to the selected ${linkType}.`,
        })
        setEditingLink(null)
        fetchData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const updatePledgeContribution = async (pledgeId: string, amount: number) => {
    const { data: pledge } = await supabase
      .from("pledges")
      .select("amount, fulfillment_status")
      .eq("id", pledgeId)
      .single()

    if (pledge) {
      // Calculate new fulfillment status based on the amount received
      const newFulfillmentStatus = Math.min(
        100,
        Math.round((pledge.fulfillment_status || 0) + (amount / pledge.amount) * 100),
      )

      await supabase
        .from("pledges")
        .update({
          fulfillment_status: newFulfillmentStatus,
        })
        .eq("id", pledgeId)
    }
  }

  const updateOutgoingPayment = async (outgoingId: string, amount: number) => {
    const { data: outgoing } = await supabase
      .from("outgoings")
      .select("amount, paid_amount")
      .eq("id", outgoingId)
      .single()

    if (outgoing) {
      const newPaidAmount = (outgoing.paid_amount || 0) + amount
      let paidStatus = "unpaid"

      if (newPaidAmount >= outgoing.amount) {
        paidStatus = "paid"
      } else if (newPaidAmount > 0) {
        paidStatus = "partial"
      }

      await supabase
        .from("outgoings")
        .update({
          paid_amount: newPaidAmount,
          paid_status: paidStatus,
        })
        .eq("id", outgoingId)
    }
  }

  const handleExport = () => {
    const csvContent = [
      [
        "Value Date",
        "Transaction Type",
        "Transaction Reference",
        "Posting Date",
        "Debit Amount",
        "Credit Amount",
        "Balance",
        "Narrative",
        "Benificiary AC",
        "Benificiary Name",
        "Transaction Date",
        "Receipt Number",
        "Status",
        "Linked To",
      ],
      ...filteredTransactions.map((transaction) => [
        transaction.value_date,
        transaction.transaction_type || "",
        transaction.transaction_reference || "",
        transaction.posting_date,
        transaction.debit_amount || "0",
        transaction.credit_amount || "0",
        transaction.balance || "0",
        transaction.description || "",
        transaction.benificiary_ac || "",
        transaction.benificiary_name || "",
        transaction.transaction_date,
        transaction.receipt_number || "",
        transaction.reconciled || transaction.pledge_id || transaction.outgoing_id ? "Reconciled" : "Unreconciled",
        transaction.pledge?.individual?.name || transaction.outgoing?.title || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bank-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: string | number) => {
    const num = Number.parseFloat(amount?.toString() || "0")
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatAccountNumber = (accountNumber: string | null) => {
    if (!accountNumber) return "N/A"
    return accountNumber.toString()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading transactions...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Filters Section */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Transaction Reference</Label>
              <Input
                placeholder="Search transaction reference..."
                value={filters.transactionReference}
                onChange={(e) => handleFilterChange("transactionReference", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Narrative</Label>
              <Input
                placeholder="Search narrative..."
                value={filters.narrative}
                onChange={(e) => handleFilterChange("narrative", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Benificiary AC</Label>
              <Input
                placeholder="Search benificiary account..."
                value={filters.benificiaryAc}
                onChange={(e) => handleFilterChange("benificiaryAc", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Benificiary Name</Label>
              <Input
                placeholder="Search benificiary name..."
                value={filters.benificiaryName}
                onChange={(e) => handleFilterChange("benificiaryName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <Input
                placeholder="Search receipt number..."
                value={filters.receiptNumber}
                onChange={(e) => handleFilterChange("receiptNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
              <Button variant="outline" onClick={removeDuplicates} disabled={removingDuplicates}>
                {removingDuplicates ? "Removing..." : "Remove Duplicates"}
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              {summary.filteredCount} of {summary.count} transactions found
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print-area">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Transactions</div>
            <div className="text-2xl font-bold">{summary.count}</div>
            {summary.filteredCount !== summary.count && (
              <div className="text-xs text-muted-foreground">({summary.filteredCount} filtered)</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Debit</div>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalDebit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Total Credit</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCredit)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm font-medium text-muted-foreground">Net Balance</div>
            <div className="text-2xl font-bold">{formatCurrency(totalCredit - totalDebit)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="print-area">
        <CardHeader className="no-print">
          <CardTitle className="flex items-center justify-between">
            <span>Bank Transactions</span>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "compact" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Compact
                </Button>
                <Button
                  variant={viewMode === "detailed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("detailed")}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Detailed
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {Object.entries(columnVisibility).map(([key, visible]) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visible}
                      onCheckedChange={(checked) => setColumnVisibility((prev) => ({ ...prev, [key]: checked }))}
                    >
                      {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex items-center gap-2">
                <Label>Rows:</Label>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Print Header */}
          <div className="hidden print:block mb-4">
            <h1 className="text-2xl font-bold">Bank Transactions Report</h1>
            <p className="text-muted-foreground">Generated on {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}</p>
            {(startDate || endDate) && (
              <p className="text-sm">
                Period: {startDate ? format(startDate, "MMM dd, yyyy") : "Start"} to{" "}
                {endDate ? format(endDate, "MMM dd, yyyy") : "End"}
              </p>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.value_date && (
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("value_date")}
                        className="h-auto p-0 font-semibold"
                      >
                        Value Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  )}
                  {columnVisibility.transaction_type && <TableHead>Transaction Type</TableHead>}
                  {columnVisibility.transaction_reference && <TableHead>Transaction Reference</TableHead>}
                  {columnVisibility.posting_date && <TableHead>Posting Date</TableHead>}
                  {columnVisibility.debit_amount && (
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("debit_amount")}
                        className="h-auto p-0 font-semibold"
                      >
                        Debit (ETB)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  )}
                  {columnVisibility.credit_amount && (
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("credit_amount")}
                        className="h-auto p-0 font-semibold"
                      >
                        Credit (ETB)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  )}
                  {columnVisibility.balance && (
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("balance")}
                        className="h-auto p-0 font-semibold"
                      >
                        Balance (ETB)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  )}
                  {columnVisibility.description && <TableHead>Narrative</TableHead>}
                  {columnVisibility.benificiary_ac && <TableHead>Benificiary AC</TableHead>}
                  {columnVisibility.benificiary_name && <TableHead>Benificiary Name</TableHead>}
                  {columnVisibility.transaction_date && (
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("transaction_date")}
                        className="h-auto p-0 font-semibold"
                      >
                        Transaction Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  )}
                  {columnVisibility.receipt_number && <TableHead>Receipt Number</TableHead>}
                  {columnVisibility.status && <TableHead>Status</TableHead>}
                  {columnVisibility.linking && <TableHead className="no-print">Link Transaction</TableHead>}
                  <TableHead className="no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      {columnVisibility.value_date && (
                        <TableCell>
                          {transaction.value_date ? new Date(transaction.value_date).toLocaleDateString() : "N/A"}
                        </TableCell>
                      )}
                      {columnVisibility.transaction_type && (
                        <TableCell>{transaction.transaction_type || "N/A"}</TableCell>
                      )}
                      {columnVisibility.transaction_reference && (
                        <TableCell className={viewMode === "compact" ? "max-w-[150px] truncate" : ""}>
                          {transaction.transaction_reference || "N/A"}
                        </TableCell>
                      )}
                      {columnVisibility.posting_date && (
                        <TableCell>
                          {transaction.posting_date ? new Date(transaction.posting_date).toLocaleDateString() : "N/A"}
                        </TableCell>
                      )}
                      {columnVisibility.debit_amount && (
                        <TableCell>
                          {Number.parseFloat(transaction.debit_amount || "0") > 0 ? (
                            <span className="font-medium text-destructive">
                              {formatCurrency(transaction.debit_amount || "0")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.credit_amount && (
                        <TableCell>
                          {Number.parseFloat(transaction.credit_amount || "0") > 0 ? (
                            <span className="font-medium text-green-600">
                              {formatCurrency(transaction.credit_amount || "0")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.balance && (
                        <TableCell className="font-medium">{formatCurrency(transaction.balance || "0")}</TableCell>
                      )}
                      {columnVisibility.description && (
                        <TableCell className={viewMode === "compact" ? "max-w-[200px] truncate" : ""}>
                          {transaction.description || "N/A"}
                        </TableCell>
                      )}
                      {columnVisibility.benificiary_ac && (
                        <TableCell className={viewMode === "compact" ? "max-w-[120px] truncate" : ""}>
                          {formatAccountNumber(transaction.benificiary_ac)}
                        </TableCell>
                      )}
                      {columnVisibility.benificiary_name && (
                        <TableCell className={viewMode === "compact" ? "max-w-[150px] truncate" : ""}>
                          {transaction.benificiary_name || "N/A"}
                        </TableCell>
                      )}
                      {columnVisibility.transaction_date && (
                        <TableCell>
                          {transaction.transaction_date
                            ? new Date(transaction.transaction_date).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                      )}
                      {columnVisibility.receipt_number && (
                        <TableCell>
                          {editingReceipt === transaction.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                value={receiptInput}
                                onChange={(e) => setReceiptInput(e.target.value)}
                                placeholder="Receipt number"
                                className="h-8 w-32"
                              />
                              <Button size="sm" onClick={() => handleSaveReceipt(transaction.id)}>
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingReceipt(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={viewMode === "compact" ? "truncate max-w-[100px]" : ""}>
                                {transaction.receipt_number || "Not set"}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingReceipt(transaction.id)
                                  setReceiptInput(transaction.receipt_number || "")
                                }}
                                className="no-print"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.status && (
                        <TableCell>
                          <Badge
                            variant={
                              transaction.reconciled || transaction.pledge_id || transaction.outgoing_id
                                ? "default"
                                : "outline"
                            }
                          >
                            {transaction.reconciled || transaction.pledge_id || transaction.outgoing_id
                              ? "Reconciled"
                              : "Unreconciled"}
                          </Badge>
                        </TableCell>
                      )}
                      {columnVisibility.linking && (
                        <TableCell className="no-print">
                          {Number.parseFloat(transaction.credit_amount || "0") > 0 ? (
                            // Credit transaction - link to pledge
                            <div className="min-w-[200px]">
                              {transaction.pledge_id && editingLink !== transaction.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-700 truncate text-sm">
                                    {transaction.pledge?.individual?.name || "Unknown"}
                                  </span>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingLink(transaction.id)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Select
                                    value={transaction.pledge_id || ""}
                                    onValueChange={(value) => handleLinkTransaction(transaction.id, "pledge", value)}
                                  >
                                    <SelectTrigger className="w-[150px]">
                                      <SelectValue placeholder="Link to pledge" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unlink">Unlink</SelectItem>
                                      {pledges
                                        .sort((a, b) => {
                                          const nameA = a.individuals?.name || "Unknown"
                                          const nameB = b.individuals?.name || "Unknown"
                                          return nameA.localeCompare(nameB)
                                        })
                                        .map((pledge) => (
                                          <SelectItem key={pledge.id} value={pledge.id}>
                                            {pledge.individuals?.name || "Unknown"} - {pledge.missionaries_committed}{" "}
                                            missionaries ({pledge.frequency})
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {editingLink === transaction.id && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingLink(null)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : Number.parseFloat(transaction.debit_amount || "0") > 0 ? (
                            // Debit transaction - link to outgoing
                            <div className="min-w-[200px]">
                              {transaction.outgoing_id && editingLink !== transaction.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-red-700 truncate text-sm">
                                    {transaction.outgoing?.title || "Unknown"}
                                  </span>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingLink(transaction.id)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Select
                                    value={transaction.outgoing_id || ""}
                                    onValueChange={(value) => handleLinkTransaction(transaction.id, "outgoing", value)}
                                  >
                                    <SelectTrigger className="w-[150px]">
                                      <SelectValue placeholder="Link to outgoing" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unlink">Unlink</SelectItem>
                                      {outgoings
                                        .sort((a, b) => a.title.localeCompare(b.title))
                                        .map((outgoing) => (
                                          <SelectItem key={outgoing.id} value={outgoing.id}>
                                            {outgoing.title}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {editingLink === transaction.id && (
                                    <Button size="sm" variant="outline" onClick={() => setEditingLink(null)}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No linking available</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="no-print">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => setSelectedTransaction(transaction)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                              <DialogDescription>Complete transaction information</DialogDescription>
                            </DialogHeader>
                            {selectedTransaction && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="font-semibold">Value Date</Label>
                                  <p>
                                    {selectedTransaction.value_date
                                      ? new Date(selectedTransaction.value_date).toLocaleDateString()
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Transaction Type</Label>
                                  <p>{selectedTransaction.transaction_type || "N/A"}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Transaction Reference</Label>
                                  <p>{selectedTransaction.transaction_reference || "N/A"}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Posting Date</Label>
                                  <p>
                                    {selectedTransaction.posting_date
                                      ? new Date(selectedTransaction.posting_date).toLocaleDateString()
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Debit Amount</Label>
                                  <p className="text-destructive font-medium">
                                    {formatCurrency(selectedTransaction.debit_amount || "0")}
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Credit Amount</Label>
                                  <p className="text-green-600 font-medium">
                                    {formatCurrency(selectedTransaction.credit_amount || "0")}
                                  </p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Balance</Label>
                                  <p className="font-medium">{formatCurrency(selectedTransaction.balance || "0")}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Benificiary AC</Label>
                                  <p>{formatAccountNumber(selectedTransaction.benificiary_ac)}</p>
                                </div>
                                <div className="col-span-2">
                                  <Label className="font-semibold">Benificiary Name</Label>
                                  <p>{selectedTransaction.benificiary_name || "N/A"}</p>
                                </div>
                                <div className="col-span-2">
                                  <Label className="font-semibold">Narrative</Label>
                                  <p>{selectedTransaction.description || "N/A"}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Receipt Number</Label>
                                  <p>{selectedTransaction.receipt_number || "Not set"}</p>
                                </div>
                                <div>
                                  <Label className="font-semibold">Status</Label>
                                  <Badge
                                    variant={
                                      selectedTransaction.reconciled ||
                                      selectedTransaction.pledge_id ||
                                      selectedTransaction.outgoing_id
                                        ? "default"
                                        : "outline"
                                    }
                                  >
                                    {selectedTransaction.reconciled ||
                                    selectedTransaction.pledge_id ||
                                    selectedTransaction.outgoing_id
                                      ? "Reconciled"
                                      : "Unreconciled"}
                                  </Badge>
                                </div>
                                {selectedTransaction.pledge_id && (
                                  <div className="col-span-2">
                                    <Label className="font-semibold">Linked to Pledge</Label>
                                    <p className="text-green-700">
                                      {selectedTransaction.pledge?.individual?.name || "Unknown"}
                                    </p>
                                  </div>
                                )}
                                {selectedTransaction.outgoing_id && (
                                  <div className="col-span-2">
                                    <Label className="font-semibold">Linked to Outgoing</Label>
                                    <p className="text-red-700">{selectedTransaction.outgoing?.title || "Unknown"}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={15} className="h-24 text-center">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between space-x-2 py-4 no-print">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of{" "}
              {filteredTransactions.length} transactions
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
