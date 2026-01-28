"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface CSVPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: any[]
  headers: string[]
  onConfirm: () => void
  onCancel: () => void
}

export function CSVPreviewModal({ open, onOpenChange, data, headers, onConfirm, onCancel }: CSVPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleConfirm = () => {
    setIsLoading(true)
    try {
      onConfirm()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview CSV Data</DialogTitle>
          <DialogDescription>
            Review the data before importing. The system will attempt to map these columns to the appropriate fields.
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="p-4">
            <div className="rounded-md border overflow-x-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((header, index) => (
                      <TableHead key={index}>{header}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.slice(0, 10).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {headers.map((header, cellIndex) => (
                        <TableCell key={cellIndex}>{row[header]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Showing {Math.min(10, data.length)} of {data.length} rows
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Importing..." : "Import Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
