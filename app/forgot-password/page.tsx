import { ForgotPasswordForm } from "@/components/forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ACLA Missions</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Reset your password</p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
