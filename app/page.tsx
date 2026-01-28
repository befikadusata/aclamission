"use client"

import { LoginForm } from "@/components/login-form"
import { Users, BarChart3 } from "lucide-react"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20">
            <Image src="/images/acla-logo.png" alt="ACLA Logo" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-blue-600 tracking-wide">ACLA Missions</h1>
            <p className="text-sm text-gray-600 mt-1">አዲስ ክርስቲያን ላይፍ አሰምብሊ</p>
            <p className="text-sm text-gray-600">Addis Christian Life Assembly</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-140px)]">
        {/* Left Side - Content */}
        <div className="flex-1 px-12 py-16">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Missions Management System</h1>
            <p className="text-xl text-gray-600 mb-16 leading-relaxed">
              Streamline your mission operations, track partnerships, and manage resources effectively for Addis
              Christian Life Assembly.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Partner Management</h3>
                <p className="text-gray-600">Track and manage all mission partners in one place.</p>
              </div>

              <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Tracking</h3>
                <p className="text-gray-600">Monitor pledges, donations, and disbursements.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-[480px] bg-white border-l border-gray-200 flex items-center justify-center px-8">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access the ACLA missions management system</p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center">
        <p className="text-gray-600 text-sm">© 2025 Addis Christian Life Assembly. All rights reserved.</p>
      </footer>
    </div>
  )
}
