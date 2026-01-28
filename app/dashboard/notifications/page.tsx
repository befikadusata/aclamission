"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, Clock, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      setLoading(true)

      const query = supabase.from("notifications").select("*").order("created_at", { ascending: false })

      // Filter based on user role
      if (profile?.role !== "admin") {
        query.eq("for_admins", false)
      } else {
        query.eq("for_admins", true)
      }

      const { data, error } = await query

      if (error) throw error
      setNotifications(data || [])
    } catch (error: any) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Failed to fetch notifications",
        variant: "destructive",
      })
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
    } catch (error: any) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)

      if (unreadIds.length === 0) return

      const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Navigate based on notification type
    if (notification.type === "commitment" && notification.related_id) {
      if (profile?.role === "admin") {
        router.push(`/dashboard/commitments?highlight=${notification.related_id}`)
      }
    }
  }

  useEffect(() => {
    if (profile) {
      fetchNotifications()

      // Set up real-time subscription
      const channel = supabase
        .channel("notifications_changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: profile.role === "admin" ? "for_admins=true" : "for_admins=false",
          },
          (payload) => {
            setNotifications((prev) => [payload.new, ...prev])
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground text-center">
                You're all caught up! New notifications will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.is_read ? "border-primary/50 bg-primary/5" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{notification.title}</h3>
                      {!notification.is_read && (
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(notification.created_at), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {notification.type === "commitment" && <FileText className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
