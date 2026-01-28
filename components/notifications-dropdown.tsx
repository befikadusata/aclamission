"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase-client"
import { useAuth } from "@/contexts/auth-context"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { profile } = useAuth()
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      // Fetch notifications based on user role
      const query = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10)

      // If user is not admin, only fetch non-admin notifications
      if (profile?.role !== "admin") {
        query.eq("for_admins", false)
      }

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id)

    // Navigate based on notification type
    if (notification.type === "commitment" && notification.related_id) {
      // For admin, navigate to the commitments page
      if (profile?.role === "admin") {
        router.push(`/dashboard/commitments?highlight=${notification.related_id}`)
      }
    }
  }

  const markAllAsRead = async () => {
    try {
      // Only update unread notifications for this user's role
      const query = supabase.from("notifications").update({ is_read: true }).eq("is_read", false)

      if (profile?.role !== "admin") {
        query.eq("for_admins", false)
      } else {
        query.eq("for_admins", true)
      }

      const { error } = await query

      if (error) throw error

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  useEffect(() => {
    if (profile) {
      fetchNotifications()

      // Set up real-time subscription for new notifications
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
            // Add new notification to the list
            setNotifications((prev) => [payload.new, ...prev].slice(0, 10))
            setUnreadCount((prev) => prev + 1)
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [profile])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-4 px-2 text-center text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start p-3 cursor-pointer ${!notification.is_read ? "bg-muted/50" : ""}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex justify-between w-full">
                <span className="font-medium">{notification.title}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(notification.created_at), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
              {!notification.is_read && (
                <Badge variant="secondary" className="mt-2">
                  New
                </Badge>
              )}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center text-center"
          onClick={() => router.push("/dashboard/notifications")}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
