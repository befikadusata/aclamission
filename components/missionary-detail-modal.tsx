"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Phone, MapPin, Calendar, Users, GraduationCap, Church, Globe, DollarSign } from "lucide-react"
import type { Database } from "@/lib/supabase"

type Missionary = Database["public"]["Tables"]["missionaries"]["Row"] & {
  agreements?: {
    id: string
    agreement_code: string
    type: string
  } | null
}

interface MissionaryDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  missionary: Missionary
}

export function MissionaryDetailModal({ open, onOpenChange, missionary }: MissionaryDetailModalProps) {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return "ETB 0.00"
    return `ETB ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "on_leave":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-20 w-20 transition-transform duration-300 ease-in-out hover:z-50 relative cursor-pointer group">
              <AvatarImage
                src={missionary.photo_url || ""}
                alt={missionary.name}
                className="object-cover transition-transform duration-300 ease-in-out"
              />
              <div
                className="fixed inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black bg-opacity-50 flex items-center justify-center"
                style={{
                  zIndex: 100,
                }}
              >
                <img
                  src={missionary.photo_url || ""}
                  alt={missionary.name}
                  className="max-w-[80vw] max-h-[80vh] object-contain rounded-lg shadow-2xl border-4 border-white"
                />
              </div>
              <AvatarFallback className="transition-transform duration-300 ease-in-out">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{missionary.name}</h2>
              <Badge variant={getStatusBadgeVariant(missionary.status) as any} className="mt-1">
                {missionary.status}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionary.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{missionary.email}</span>
                </div>
              )}
              {missionary.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{missionary.phone}</span>
                </div>
              )}
              {missionary.country_of_service && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>{missionary.country_of_service}</span>
                </div>
              )}
              {missionary.area_of_ministry && (
                <div className="flex items-center gap-2">
                  <Church className="h-4 w-4 text-muted-foreground" />
                  <span>{missionary.area_of_ministry}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Added: {new Date(missionary.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Personal & Demographic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionary.gender && (
                <div>
                  <span className="font-medium">Gender: </span>
                  <span className="capitalize">{missionary.gender}</span>
                </div>
              )}
              {missionary.age && (
                <div>
                  <span className="font-medium">Age: </span>
                  <span>{missionary.age} years old</span>
                </div>
              )}
              {missionary.marital_status && (
                <div>
                  <span className="font-medium">Marital Status: </span>
                  <span className="capitalize">{missionary.marital_status}</span>
                </div>
              )}
              {missionary.number_of_family_members !== null && (
                <div>
                  <span className="font-medium">Family Members: </span>
                  <span>{missionary.number_of_family_members}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Background Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionary.denomination && (
                <div>
                  <span className="font-medium">Denomination: </span>
                  <span>{missionary.denomination}</span>
                </div>
              )}
              {missionary.church && (
                <div>
                  <span className="font-medium">Church: </span>
                  <span>{missionary.church}</span>
                </div>
              )}
              {missionary.educational_status && (
                <div>
                  <span className="font-medium">Education: </span>
                  <span>{missionary.educational_status}</span>
                </div>
              )}
              {missionary.language && (
                <div>
                  <span className="font-medium">Languages: </span>
                  <span>{missionary.language}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Geographical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {missionary.region && (
                <div>
                  <span className="font-medium">Region: </span>
                  <span>{missionary.region}</span>
                </div>
              )}
              {missionary.zone && (
                <div>
                  <span className="font-medium">Zone: </span>
                  <span>{missionary.zone}</span>
                </div>
              )}
              {missionary.woreda && (
                <div>
                  <span className="font-medium">Woreda: </span>
                  <span>{missionary.woreda}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Monthly Support: </span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(missionary.monthly_support_amount)}
                </span>
              </div>
              {missionary.information_approved_by && (
                <div>
                  <span className="font-medium">Approved By: </span>
                  <span>{missionary.information_approved_by}</span>
                </div>
              )}
              {missionary.agreements && (
                <div>
                  <span className="font-medium">Agreement: </span>
                  <span>{missionary.agreements.agreement_code}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ministry Description */}
          {missionary.ministry_description && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Ministry Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{missionary.ministry_description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
