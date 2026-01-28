"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Check, Globe } from "lucide-react"

export default function EnvConfig() {
  const [siteUrl, setSiteUrl] = useState("")
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const envVar = `NEXT_PUBLIC_SITE_URL=${siteUrl}`
    navigator.clipboard.writeText(envVar)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const isValidUrl = siteUrl === "" || validateUrl(siteUrl)

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configure Site URL
          </CardTitle>
          <CardDescription>Set your site URL for email verification links and redirects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteUrl">Site URL</Label>
            <Input
              id="siteUrl"
              type="url"
              placeholder="https://your-domain.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              className={!isValidUrl ? "border-red-500" : ""}
            />
            {!isValidUrl && (
              <p className="text-sm text-red-500">Please enter a valid URL (e.g., https://your-domain.com)</p>
            )}
          </div>

          {siteUrl && isValidUrl && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Environment Variable:</p>
                  <div className="flex items-center gap-2 p-2 bg-gray-100 rounded font-mono text-sm">
                    <code className="flex-1">NEXT_PUBLIC_SITE_URL={siteUrl}</code>
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 w-8 p-0">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 text-sm text-gray-600">
            <h4 className="font-medium text-gray-900">Common Examples:</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <code>https://your-domain.com</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSiteUrl("https://your-domain.com")}
                  className="h-6 text-xs"
                >
                  Use
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <code>https://acla-missions.vercel.app</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSiteUrl("https://acla-missions.vercel.app")}
                  className="h-6 text-xs"
                >
                  Use
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <code>http://localhost:3000</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSiteUrl("http://localhost:3000")}
                  className="h-6 text-xs"
                >
                  Use
                </Button>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Enter your site URL above</li>
                <li>Copy the environment variable</li>
                <li>Add it to your Vercel project settings or .env.local file</li>
                <li>Redeploy your application</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
