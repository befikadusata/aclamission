"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function DebugPartners() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testFetch = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Testing partners fetch...")

      const { data, error, count } = await supabase
        .from("partners")
        .select("*", { count: "exact" })
        .order("name", { ascending: true })

      console.log("Partners query result:", { data, error, count })

      if (error) {
        setError(error.message)
        console.error("Partners fetch error:", error)
      } else {
        setPartners(data || [])
        console.log("Partners fetched successfully:", data)
      }
    } catch (err: any) {
      setError(err.message)
      console.error("Unexpected error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testFetch()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug Partners Fetch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testFetch} disabled={loading}>
          {loading ? "Testing..." : "Test Fetch"}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <p>
            <strong>Partners found:</strong> {partners.length}
          </p>
          {partners.map((partner, index) => (
            <div key={partner.id} className="p-2 bg-gray-50 rounded">
              <p>
                <strong>{index + 1}.</strong> {partner.name} ({partner.type})
              </p>
              <p className="text-sm text-gray-600">Status: {partner.status}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
