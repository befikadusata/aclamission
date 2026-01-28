"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle } from "lucide-react"

interface CSVColumnMapperProps {
  csvHeaders: string[]
  csvData: any[]
  onMappingComplete: (mapping: Record<string, string>, mappedData: any[]) => void
  onCancel: () => void
}

const DATABASE_COLUMNS = [
  { key: "value_date", label: "Value Date", required: true, type: "date" },
  { key: "transaction_type", label: "Transaction Type", required: false, type: "text" },
  { key: "transaction_reference", label: "Transaction Reference", required: false, type: "text" },
  { key: "posting_date", label: "Posting Date", required: false, type: "date" },
  { key: "debit_amount", label: "Debit Amount", required: false, type: "number" },
  { key: "credit_amount", label: "Credit Amount", required: false, type: "number" },
  { key: "balance", label: "Balance", required: false, type: "number" },
  { key: "description", label: "Narrative/Description", required: false, type: "text" },
  { key: "benificiary_ac", label: "Benificiary AC", required: false, type: "text" },
  { key: "benificiary_name", label: "Benificiary Name", required: false, type: "text" },
  { key: "transaction_date", label: "Transaction Date", required: false, type: "date" },
  { key: "branch_code", label: "Branch Code", required: false, type: "text" },
  { key: "account_number", label: "Account Number", required: false, type: "text" },
]

export function CSVColumnMapper({ csvHeaders, csvData, onMappingComplete, onCancel }: CSVColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({})

  // Auto-detect mappings based on common patterns
  const getAutoMapping = () => {
    const autoMapping: Record<string, string> = {}

    csvHeaders.forEach((header) => {
      const lowerHeader = header.toLowerCase().trim()

      // Auto-detect common patterns
      if (lowerHeader.includes("value") && lowerHeader.includes("date")) {
        autoMapping["value_date"] = header
      } else if (lowerHeader.includes("transaction") && lowerHeader.includes("type")) {
        autoMapping["transaction_type"] = header
      } else if (lowerHeader.includes("transaction") && lowerHeader.includes("reference")) {
        autoMapping["transaction_reference"] = header
      } else if (lowerHeader.includes("posting") && lowerHeader.includes("date")) {
        autoMapping["posting_date"] = header
      } else if (lowerHeader.includes("debit") || lowerHeader.includes("withdrawal")) {
        autoMapping["debit_amount"] = header
      } else if (lowerHeader.includes("credit") || lowerHeader.includes("deposit")) {
        autoMapping["credit_amount"] = header
      } else if (lowerHeader.includes("balance")) {
        autoMapping["balance"] = header
      } else if (lowerHeader.includes("narrative") || lowerHeader.includes("description")) {
        autoMapping["description"] = header
      } else if (
        lowerHeader.includes("beneficiary") &&
        (lowerHeader.includes("ac") || lowerHeader.includes("account"))
      ) {
        autoMapping["benificiary_ac"] = header
      } else if (lowerHeader.includes("beneficiary") && lowerHeader.includes("name")) {
        autoMapping["benificiary_name"] = header
      } else if (lowerHeader.includes("transaction") && lowerHeader.includes("date")) {
        autoMapping["transaction_date"] = header
      } else if (lowerHeader.includes("branch") && lowerHeader.includes("code")) {
        autoMapping["branch_code"] = header
      } else if (lowerHeader.includes("account") && lowerHeader.includes("number")) {
        autoMapping["account_number"] = header
      }
    })

    return autoMapping
  }

  // Initialize with auto-detected mappings
  useState(() => {
    const autoMapping = getAutoMapping()
    setMapping(autoMapping)
  })

  const handleMappingChange = (dbColumn: string, csvColumn: string) => {
    setMapping((prev) => ({
      ...prev,
      [dbColumn]: csvColumn === "none" ? "" : csvColumn,
    }))
  }

  const getRequiredMappings = () => {
    return DATABASE_COLUMNS.filter((col) => col.required && !mapping[col.key])
  }

  const canProceed = () => {
    const requiredMappings = getRequiredMappings()
    return requiredMappings.length === 0
  }

  const handleProceed = () => {
    // Transform CSV data based on mapping
    const mappedData = csvData.map((row) => {
      const mappedRow: any = {}

      Object.entries(mapping).forEach(([dbColumn, csvColumn]) => {
        if (csvColumn && row[csvColumn] !== undefined) {
          mappedRow[dbColumn] = row[csvColumn]
        }
      })

      // Set default values for unmapped fields
      DATABASE_COLUMNS.forEach((col) => {
        if (!mappedRow[col.key]) {
          if (col.type === "number") {
            mappedRow[col.key] = 0
          } else if (col.type === "boolean") {
            mappedRow[col.key] = false
          } else {
            mappedRow[col.key] = null
          }
        }
      })

      return mappedRow
    })

    onMappingComplete(mapping, mappedData)
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Map CSV Columns to Database Fields
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Match your CSV columns with the database fields. Required fields must be mapped to proceed.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mapping Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Database Field</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>CSV Column</TableHead>
                <TableHead>Sample Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DATABASE_COLUMNS.map((dbCol) => (
                <TableRow key={dbCol.key}>
                  <TableCell className="font-medium">
                    {dbCol.label}
                    <div className="text-xs text-muted-foreground">{dbCol.key}</div>
                  </TableCell>
                  <TableCell>
                    {dbCol.required ? (
                      <Badge variant="destructive">Required</Badge>
                    ) : (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping[dbCol.key] || "none"}
                      onValueChange={(value) => handleMappingChange(dbCol.key, value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Not mapped --</SelectItem>
                        {csvHeaders.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {mapping[dbCol.key] && csvData.length > 0 ? (
                      <div className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {csvData[0][mapping[dbCol.key]] || "N/A"}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No data</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* CSV Preview */}
        <div>
          <Label className="text-base font-semibold">CSV Data Preview (First 3 rows)</Label>
          <div className="mt-2 rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvHeaders.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData.slice(0, 3).map((row, index) => (
                  <TableRow key={index}>
                    {csvHeaders.map((header) => (
                      <TableCell key={header} className="whitespace-nowrap max-w-[150px] truncate">
                        {row[header] || "N/A"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canProceed() ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Ready to import {csvData.length} rows</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-amber-600 font-medium">
                  {getRequiredMappings().length} required field(s) need mapping
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleProceed} disabled={!canProceed()}>
              Import Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
