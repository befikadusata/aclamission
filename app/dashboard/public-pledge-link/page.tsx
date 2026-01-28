"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, ExternalLink, CheckCircle2, Link2, QrCode } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export default function PublicPledgeLinkPage() {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  
  // Construct the public pledge URL
  const publicUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/public-pledge`
    : "/public-pledge"

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Public pledge link has been copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  const openInNewTab = () => {
    window.open(publicUrl, "_blank")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public Pledge Link</h1>
        <p className="text-muted-foreground">
          Share this link with supporters to collect pledge renewals for ACLA Missions Week
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Link Card */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Public Pledge Renewal Form
            </CardTitle>
            <CardDescription>
              This public form allows supporters to submit their pledge information without logging in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={publicUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button onClick={copyToClipboard} variant="outline" size="icon">
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="sr-only">Copy link</span>
              </Button>
              <Button onClick={openInNewTab} variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open in new tab</span>
              </Button>
            </div>
            
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="mb-2 font-semibold">How to use this link:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Share via email, SMS, or social media</li>
                <li>• Display on screens during Missions Week</li>
                <li>• Include in church bulletins or announcements</li>
                <li>• All submissions will appear as &quot;Pending&quot; in the Pledges section</li>
                <li>• Review and approve pledges from the admin dashboard</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle>Form Features</CardTitle>
            <CardDescription>What supporters can do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <span>Submit pledge amounts for multiple missionaries</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <span>Choose monthly or one-time pledge types</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <span>Provide contact information for follow-up</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
              <span>No login or account required</span>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code (Coming Soon)
            </CardTitle>
            <CardDescription>Generate a QR code for easy sharing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
              <p className="text-sm text-muted-foreground">QR Code feature coming soon</p>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
            <CardDescription>Tips for collecting pledges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Before Missions Week</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Send link in advance via email</li>
                  <li>• Share on church social media</li>
                  <li>• Include in weekly bulletins</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">During Missions Week</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Display link on screens</li>
                  <li>• Have tablets available for in-person pledges</li>
                  <li>• Check for new submissions daily</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
