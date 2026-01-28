"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface MissionaryColumnMapperProps {
  excelHeaders: string[]
  excelData: any[]
  onMappingComplete: (mapping: Record<string, string>, mappedData: any[]) => void
  onCancel: () => void
}

// Database field definitions for missionaries
const DATABASE_FIELDS = [
  { key: "name", label: "Name", required: true, description: "Full name of the missionary" },
  { key: "phone", label: "Phone", required: false, description: "Phone number" },
  { key: "email", label: "Email", required: false, description: "Email address" },
  {
    key: "country_of_service",
    label: "Country of Service",
    required: false,
    description: "Country where missionary serves",
  },
  {
    key: "ministry_description",
    label: "Ministry Description",
    required: false,
    description: "Description of ministry work",
  },
  { key: "area_of_ministry", label: "Area of Ministry", required: true, description: "Primary area of ministry" },
  {
    key: "status",
    label: "Status",
    required: false,
    description: "Current status (active, inactive, on_leave)",
    constraint: "Must be one of: active, inactive, on_leave",
  },
  { key: "photo_url", label: "Photo URL", required: false, description: "URL to missionary photo" },
  {
    key: "gender",
    label: "Gender",
    required: false,
    description: "Gender (male or female)",
    constraint: "Must be one of: male, female",
  },
  { key: "age", label: "Age", required: false, description: "Age in years" },
  {
    key: "marital_status",
    label: "Marital Status",
    required: false,
    description: "Marital status",
    constraint: "Must be one of: married, single",
  },
  {
    key: "number_of_family_members",
    label: "Family Members",
    required: false,
    description: "Number of family members",
  },
  { key: "denomination", label: "Denomination", required: false, description: "Religious denomination" },
  { key: "church", label: "Church", required: false, description: "Home church" },
  { key: "educational_status", label: "Education", required: false, description: "Educational background" },
  { key: "language", label: "Language", required: false, description: "Primary language" },
  { key: "region", label: "Region", required: false, description: "Geographic region" },
  { key: "zone", label: "Zone", required: false, description: "Administrative zone" },
  { key: "woreda", label: "Woreda", required: false, description: "Local administrative area" },
  {
    key: "information_approved_by",
    label: "Approved By",
    required: false,
    description: "Who approved the information",
  },
  { key: "monthly_support_amount", label: "Monthly Support", required: false, description: "Monthly support amount" },
]

export function MissionaryColumnMapper({
  excelHeaders,
  excelData,
  onMappingComplete,
  onCancel,
}: MissionaryColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [previewData, setPreviewData] = useState<any[]>([])

  // Auto-detect column mappings based on common patterns
  useEffect(() => {
    const autoMapping: Record<string, string> = {}

    DATABASE_FIELDS.forEach((field) => {
      const matchingHeader = excelHeaders.find((header) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "")
        const normalizedField = field.key.toLowerCase().replace(/[^a-z0-9]/g, "")

        // Direct match
        if (normalizedHeader === normalizedField) return true

        // Common variations
        const variations: Record<string, string[]> = {
          name: ["fullname", "missionaryname", "firstname", "lastname"],
          phone: ["phonenumber", "mobile", "contact", "telephone"],
          email: ["emailaddress", "mail"],
          country_of_service: ["country", "servicecountry", "location"],
          ministry_description: ["ministry", "description", "work", "role"],
          area_of_ministry: ["area", "ministryarea", "field", "department"],
          status: ["currentstatus", "active", "state"],
          gender: ["sex"],
          age: ["years", "ageinyears"],
          marital_status: ["marital", "married", "single"],
          number_of_family_members: ["family", "familysize", "members"],
          denomination: ["church", "faith"],
          educational_status: ["education", "degree", "qualification"],
          monthly_support_amount: ["support", "amount", "salary", "stipend"],
        }

        return variations[field.key]?.some((variation) => normalizedHeader.includes(variation)) || false
      })

      if (matchingHeader) {
        autoMapping[field.key] = matchingHeader
      }
    })

    // Wrap in async function to avoid direct state update in effect
    const updateMapping = async () => {
      setMapping(autoMapping)
    }
    updateMapping()
  }, [excelHeaders])

  // Update preview when mapping changes
  useEffect(() => {
    const mappedData = excelData.slice(0, 5).map((row) => {
      const mappedRow: any = {}
      Object.entries(mapping).forEach(([dbField, excelHeader]) => {
        if (excelHeader && row[excelHeader] !== undefined) {
          mappedRow[dbField] = row[excelHeader]
        }
      })
      return mappedRow
    })

    // Wrap in async function to avoid direct state update in effect
    const updatePreview = async () => {
      setPreviewData(mappedData)
    }
    updatePreview()
  }, [mapping, excelData])

  const handleMappingChange = (dbField: string, excelHeader: string) => {
    setMapping((prev) => ({
      ...prev,
      [dbField]: excelHeader === "none" ? "" : excelHeader,
    }))
  }

  const handleImport = () => {
    // Create mapped data for all rows
    const mappedData = excelData.map((row) => {
      const mappedRow: any = {}
      Object.entries(mapping).forEach(([dbField, excelHeader]) => {
        if (excelHeader && row[excelHeader] !== undefined) {
          mappedRow[dbField] = row[excelHeader]
        }
      })
      return mappedRow
    })

    onMappingComplete(mapping, mappedData)
  }

  const requiredFieldsMapped = DATABASE_FIELDS.filter((field) => field.required).every((field) => mapping[field.key])

  const getMappedFieldsCount = () => Object.values(mapping).filter((value) => value).length

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Map Excel Columns to Database Fields
              <Badge variant={requiredFieldsMapped ? "default" : "destructive"}>
                {getMappedFieldsCount()} of {DATABASE_FIELDS.length} fields mapped
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {DATABASE_FIELDS.map((field) => (
                <div key={field.key} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.label}</span>
                      {field.required && <Badge variant="destructive">Required</Badge>}
                      {field.constraint && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Info className="h-4 w-4 text-blue-500 cursor-help" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{field.constraint}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {mapping[field.key] && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>

                  <Select
                    value={mapping[field.key] || "none"}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Excel column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Not mapped --</SelectItem>
                      {excelHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="text-sm text-muted-foreground">
                    {mapping[field.key] && excelData[0] && (
                      <span>Preview: {String(excelData[0][mapping[field.key]] || "").substring(0, 50)}...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Field Constraints Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Info className="h-5 w-5" />
              <span className="font-medium">Important Field Constraints</span>
            </div>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>
                • <strong>Gender:</strong> Must be "male" or "female" (will be normalized automatically)
              </li>
              <li>
                • <strong>Marital Status:</strong> Must be "married" or "single" (will be normalized automatically)
              </li>
              <li>
                • <strong>Status:</strong> Must be "active", "inactive", or "on_leave" (defaults to "active")
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Data Preview (First 5 rows)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {DATABASE_FIELDS.filter((field) => mapping[field.key]).map((field) => (
                      <TableHead key={field.key}>{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row, index) => (
                    <TableRow key={index}>
                      {DATABASE_FIELDS.filter((field) => mapping[field.key]).map((field) => (
                        <TableCell key={field.key}>{String(row[field.key] || "").substring(0, 50)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Validation Messages */}
        {!requiredFieldsMapped && (
          <Card className="border-destructive">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Required fields missing</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Please map all required fields:{" "}
                {DATABASE_FIELDS.filter((field) => field.required && !mapping[field.key])
                  .map((field) => field.label)
                  .join(", ")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={handleImport} disabled={!requiredFieldsMapped} className="flex-1">
            Import {excelData.length} Missionaries
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
