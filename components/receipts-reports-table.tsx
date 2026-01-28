"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Download, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ReceiptsReportsTableProps {
  partnerId: string
  refreshTrigger?: number
}

export function ReceiptsReportsTable({ partnerId, refreshTrigger }: ReceiptsReportsTableProps) {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchDocuments()
  }, [partnerId, refreshTrigger])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      // This would fetch from a documents/reports table
      // For now, we'll show a placeholder
      setDocuments([])
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Loading documents...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipts & Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "Unknown date"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{doc.type}</Badge>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4" />
            <p>No receipts or reports uploaded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
