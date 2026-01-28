import { PublicPledgeForm } from "@/components/public-pledge-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Users, Gift, Info } from "lucide-react"
import Image from "next/image"

export const metadata = {
  title: "ACLA Missions Week - Pledge Renewal",
  description: "Submit your pledge to support ACLA missionaries during Missions Week",
}

export default function PublicPledgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-5xl space-y-8 px-4 py-12">
        {/* Header Section */}
        <div className="space-y-4 text-center">
          <div className="mb-6 flex justify-center">
            <Image src="/images/acla-logo.png" alt="ACLA Logo" width={120} height={120} className="h-24 w-auto" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">ACLA Missions Week</h1>
          <p className="text-xl text-muted-foreground">Pledge Renewal Form</p>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Thank you for your commitment to support ACLA missionaries! Please fill out the form below to renew or
            create your pledge. You can choose one or more types of support that work best for you.
          </p>
        </div>

        {/* Info Cards - Support Types */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Missionary Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Commit to supporting one or more missionaries with regular financial contributions on a monthly,
                quarterly, or annual basis.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Heart className="h-5 w-5 text-purple-600" />
                <span>Special Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Provide additional financial support for special projects, emergency needs, and ministry initiatives
                beyond regular support.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-base">
                <Gift className="h-5 w-5 text-orange-600" />
                <span>In-Kind Support</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Donate goods, services, or materials such as clothing, books, medical supplies, educational materials,
                or transportation.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-start space-x-3 py-4">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900">Important Information</p>
              <p className="text-sm text-muted-foreground">
                All pledges are optional and will be reviewed by our team. After submission, you will receive a
                confirmation within 2-3 business days. You can select one or multiple types of support based on your
                preference.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pledge Form */}
        <PublicPledgeForm />

        {/* Footer */}
        <Card className="border-muted">
          <CardContent className="py-4">
            <p className="text-center text-sm text-muted-foreground">
              All pledges are subject to review and approval by the ACLA Missions team. For questions or assistance,
              please contact the church office.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
