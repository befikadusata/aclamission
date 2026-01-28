"use client"

import type React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { Home, Target, User, Bell, LogOut, ChevronRight, Upload } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"

interface SupporterDashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  action?: React.ReactNode
}

export function SupporterDashboardLayout({
  children,
  title = "Dashboard",
  subtitle = "Your missionary support overview",
  action,
}: SupporterDashboardLayoutProps) {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  // Fetch unread notifications count
  useEffect(() => {
    if (user) {
      const fetchUnreadCount = async () => {
        const { data, error } = await supabase
          .from("notifications")
          .select("count", { count: "exact", head: true })
          .eq("is_read", false)
          .eq("for_admins", false)

        if (!error && data) {
          setUnreadNotifications(data)
        }
      }

      fetchUnreadCount()

      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel("supporter_notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: "for_admins=false",
          },
          () => {
            fetchUnreadCount()
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const navigation = [
    {
      name: "Dashboard",
      href: "/supporter-dashboard",
      icon: Home,
      current: pathname === "/supporter-dashboard",
    },
    {
      name: "My Pledges",
      href: "/supporter-dashboard/pledges",
      icon: Target,
      current: pathname === "/supporter-dashboard/pledges",
    },
    {
      name: "My Commitments",
      href: "/supporter-dashboard/commitments",
      icon: Upload,
      current: pathname === "/supporter-dashboard/commitments",
    },
    {
      name: "Notifications",
      href: "/supporter-dashboard/notifications",
      icon: Bell,
      current: pathname === "/supporter-dashboard/notifications",
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    {
      name: "My Profile",
      href: "/supporter-dashboard/profile",
      icon: User,
      current: pathname === "/supporter-dashboard/profile",
    },
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      // The signOut function in auth context already handles the redirect
    } catch (error) {
      console.error("Error signing out:", error)
      // Fallback: force redirect to home page
      window.location.href = "/"
    }
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length <= 2) return [{ name: title, href: pathname }]

    const breadcrumbs = [{ name: "Dashboard", href: "/supporter-dashboard" }]

    if (segments[2] === "pledges") {
      breadcrumbs.push({ name: "My Pledges", href: "/supporter-dashboard/pledges" })
    } else if (segments[2] === "commitments") {
      breadcrumbs.push({ name: "My Commitments", href: "/supporter-dashboard/commitments" })
    } else if (segments[2] === "notifications") {
      breadcrumbs.push({ name: "Notifications", href: "/supporter-dashboard/notifications" })
    } else if (segments[2] === "profile") {
      breadcrumbs.push({ name: "My Profile", href: "/supporter-dashboard/profile" })
    } else if (segments[2] === "new-pledge") {
      breadcrumbs.push({ name: "New Pledge", href: "/supporter-dashboard/new-pledge" })
    }

    return breadcrumbs
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg">
        <div className="flex h-16 items-center px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">ACLA Missions</h1>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    item.current
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Sign Out Button in Sidebar */}
        <div className="absolute bottom-16 left-0 right-0 px-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 ACLA Church</p>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center justify-between px-6">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              {getBreadcrumbs().map((crumb, index) => (
                <div key={crumb.href} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
                  <span
                    className={index === getBreadcrumbs().length - 1 ? "text-gray-900 dark:text-white font-medium" : ""}
                  >
                    {crumb.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/supporter-dashboard/notifications")}
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
              </Button>

              <ModeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{profile?.full_name || "User"}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuItem onClick={() => router.push("/supporter-dashboard/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
                <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
              </div>
              {action && <div>{action}</div>}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  )
}
