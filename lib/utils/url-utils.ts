export function getBaseUrl(): string {
  // Check for NEXT_PUBLIC_SITE_URL first (this should be set in production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }

  // Fallback to Vercel URL if available
  if (process.env.VERCEL_URL) {
    return `https  "")
  }

  // Fallback to Vercel URL if available
  if (process.env.VERCEL_URL) {
    return \`https://${process.env.VERCEL_URL}`
  }

  // Development fallback
  return "http://localhost:3000"
}

export function constructVerificationUrl(token: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/verify-email?token=${token}`
}

export function constructResetPasswordUrl(token: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/reset-password?token=${token}`
}
