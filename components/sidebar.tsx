"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { BarChart3, HandCoins, Upload, CreditCard, Users, X, Home, Bell, UserCog, Link2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const pathname = usePathname()

  const routes = [
    {
      label: "Dashboard",
      icon: Home,
      href: "/dashboard",
      active: pathname === "/dashboard",
    },
    {
      label: "Pledges",
      icon: HandCoins,
      href: "/dashboard/pledges",
      active: pathname === "/dashboard/pledges",
    },
    {
      label: "Bank Statements",
      icon: Upload,
      href: "/dashboard/bank-statements",
      active: pathname === "/dashboard/bank-statements",
    },
    {
      label: "Outgoings",
      icon: CreditCard,
      href: "/dashboard/outgoings",
      active: pathname === "/dashboard/outgoings",
    },
    {
      label: "Partners",
      icon: Users,
      href: "/dashboard/partners",
      active: pathname === "/dashboard/partners",
    },
    {
      label: "Public Pledge Link",
      icon: Link2,
      href: "/dashboard/public-pledge-link",
      active: pathname === "/dashboard/public-pledge-link",
    },
    {
      label: "User Accounts",
      icon: UserCog,
      href: "/dashboard/user-accounts",
      active: pathname === "/dashboard/user-accounts",
    },
    {
      label: "Commitments",
      icon: Upload,
      href: "/dashboard/commitments",
      active: pathname === "/dashboard/commitments",
    },
    {
      label: "Notifications",
      icon: Bell,
      href: "/dashboard/notifications",
      active: pathname === "/dashboard/notifications",
    },
    {
      label: "Reports",
      icon: BarChart3,
      href: "/dashboard/reports",
      active: pathname === "/dashboard/reports",
    },
  ]

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r bg-white dark:bg-gray-800 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ACLA Missions</h2>
        </div>
        <ScrollArea className="flex-1 py-2">
          <nav className="grid gap-1 px-2">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  route.active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <route.icon className="h-5 w-5" />
                {route.label}
              </Link>
            ))}
          </nav>
        </ScrollArea>
        <div className="mt-auto p-4 border-t dark:border-gray-700">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ACLA Church</p>
        </div>
      </aside>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">ACLA Missions</h2>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <ScrollArea className="flex-1 py-2">
            <nav className="grid gap-1 px-2">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                    route.active ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  <route.icon className="h-5 w-5" />
                  {route.label}
                </Link>
              ))}
            </nav>
          </ScrollArea>
          <div className="mt-auto p-4 border-t">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} ACLA Church</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
