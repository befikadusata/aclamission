"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SupporterMetricCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: "green" | "blue" | "red" | "purple" | "orange" | "yellow"
  className?: string
}

export function SupporterMetricCard({ title, value, subtitle, icon, color, className }: SupporterMetricCardProps) {
  const colorClasses = {
    green: "text-green-600 dark:text-green-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              <div className="text-gray-400 dark:text-gray-500">{icon}</div>
            </div>
            <div className={cn("text-2xl font-bold", colorClasses[color])}>{value}</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
