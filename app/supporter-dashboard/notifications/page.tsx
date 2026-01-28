"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Bell, Check, CheckCircle, XCircle, AlertCircle, Calendar, Clock, Mail } from "lucide-react"
import { SupporterDashboardLayout } from "@/components/supporter-dashboard-layout"
import { SupporterMetricCard } from "@/components/supporter-metric-card"
import { format } from "date-fns"

export default function SupporterNotificationsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    try {
      setLoading(true)

      if (!user?.id) {
        setNotifications([])
        return
      }

      // First get all commitment IDs for the current user
      const { data: userCommitments, error: commitmentsError } = await supabase
        .from("commitments")
        .select("id")
        .eq("user_id", user.id)

      if (commitmentsError) throw commitmentsError

      const commitmentIds = userCommitments?.map((c) => c.id) || []

      // If user has no commitments, show empty notifications
      if (commitmentIds.length === 0) {
        setNotifications([])
        return
      }

      // Fetch notifications related to user's commitments
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("for_admins", false)
        .in("related_id", commitmentIds)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false)
        .eq("for_admins", false)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id)

    // Navigate based on notification type
    if (notification.type === "commitment_status" && notification.related_id) {
      router.push(`/supporter-dashboard/commitments?highlight=${notification.related_id}`)
    }
  }

  const getNotificationIcon = (notification: any) => {
    if (notification.type === "commitment_status") {
      if (notification.title.includes("Approved")) {
        return <CheckCircle className="h-5 w-5 text-green-500" />
      } else if (notification.title.includes("Rejected")) {
        return <XCircle className="h-5 w-5 text-red-500" />
      }
    }
    return <AlertCircle className="h-5 w-5 text-blue-500" />
  }

  const getStatusColor = (notification: any) => {
    if (notification.type === "commitment_status") {
      if (notification.title.includes("Approved")) return "bg-green-500"
      if (notification.title.includes("Rejected")) return "bg-red-500"
    }
    return "bg-blue-500"
  }

  const getStatusText = (notification: any) => {
    if (notification.type === "commitment_status") {
      if (notification.title.includes("Approved")) return "Approved"
      if (notification.title.includes("Rejected")) return "Rejected"
    }
    return "Info"
  }

  useEffect(() => {
    // If user is not authenticated, redirect to home
    if (!user || !profile) {
      router.push("/")
      return
    }

    // If user is not a supporter, redirect to dashboard
    if (profile.role !== "supporter") {
      router.push("/dashboard")
      return
    }

    fetchNotifications()

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel("supporter_notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "for_admins=false",
        },
        async (payload) => {
          // Check if this notification is related to the current user's commitments
          if (payload.new.related_id) {
            const { data: commitment } = await supabase
              .from("commitments")
              .select("user_id")
              .eq("id", payload.new.related_id)
              .single()

            // Only add notification if it belongs to the current user
            if (commitment?.user_id === user.id) {
              setNotifications((prev) => [payload.new, ...prev])
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, profile, router])

  if (loading) {
    return (
      <SupporterDashboardLayout title="Notifications" subtitle="Stay updated on your missionary support activities">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SupporterDashboardLayout>
    )
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const readCount = notifications.filter((n) => n.is_read).length
  const approvedCount = notifications.filter((n) => n.title?.includes("Approved")).length
  const rejectedCount = notifications.filter((n) => n.title?.includes("Rejected")).length

  return (
    <SupporterDashboardLayout
      title="Notifications"
      subtitle="Stay updated on your missionary support activities"
      action={
        unreadCount > 0 && (
          <Button onClick={markAllAsRead} className="bg-blue-600 hover:bg-blue-700">
            <Check className="mr-2 h-4 w-4" />
            Mark All as Read
          </Button>
        )
      }
    >
      <div className="space-y-6">
        {notifications.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Notifications Yet</CardTitle>
              <CardDescription>
                You haven't received any notifications yet. You'll be notified when your commitments are reviewed or
                when there are important updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => router.push("/supporter-dashboard/pledges")}>
                <Bell className="mr-2 h-4 w-4" />
                View My Pledges
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <SupporterMetricCard
                title="Total Notifications"
                value={notifications.length}
                subtitle="All notifications"
                icon={<Bell className="h-5 w-5" />}
                color="blue"
              />
              <SupporterMetricCard
                title="Unread"
                value={unreadCount}
                subtitle="New notifications"
                icon={<Mail className="h-5 w-5" />}
                color="orange"
              />
              <SupporterMetricCard
                title="Approved"
                value={approvedCount}
                subtitle="Commitment approvals"
                icon={<CheckCircle className="h-5 w-5" />}
                color="green"
              />
              <SupporterMetricCard
                title="Rejected"
                value={rejectedCount}
                subtitle="Commitment rejections"
                icon={<XCircle className="h-5 w-5" />}
                color="red"
              />
            </div>

            {/* Notifications Grid */}
            <div className="grid grid-cols-1 gap-6">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`overflow-hidden cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? "ring-2 ring-blue-200 dark:ring-blue-800" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className={`h-2 ${getStatusColor(notification)}`}></div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getNotificationIcon(notification)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{notification.title}</CardTitle>
                            {!notification.is_read && (
                              <Badge variant="destructive" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">{notification.message}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant={
                          notification.title?.includes("Approved")
                            ? "default"
                            : notification.title?.includes("Rejected")
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {getStatusText(notification)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                          <span>Received</span>
                        </div>
                        <span className="font-medium">{format(new Date(notification.created_at), "MMM d, yyyy")}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-gray-400" />
                          <span>Time</span>
                        </div>
                        <span className="font-medium">{format(new Date(notification.created_at), "h:mm a")}</span>
                      </div>

                      {notification.type && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <AlertCircle className="mr-2 h-4 w-4 text-gray-400" />
                            <span>Type</span>
                          </div>
                          <span className="font-medium capitalize">{notification.type.replace("_", " ")}</span>
                        </div>
                      )}

                      {notification.related_id && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            <Bell className="mr-2 h-4 w-4 text-gray-400" />
                            <span>Reference</span>
                          </div>
                          <span className="font-medium text-xs">{notification.related_id.substring(0, 8)}...</span>
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Status: {notification.is_read ? "Read" : "Unread"}
                          </span>
                          {notification.type === "commitment_status" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push("/supporter-dashboard/commitments")
                              }}
                            >
                              View Commitments
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </SupporterDashboardLayout>
  )
}
