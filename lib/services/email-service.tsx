import { constructVerificationUrl } from "@/lib/utils/url-utils"

interface BrevoEmailResponse {
  success: boolean
  message: string
  data?: any
}

interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
}

class EmailService {
  private apiKey: string
  private apiUrl = "https://api.brevo.com/v3"
  private senderEmail: string
  private senderName: string

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || ""
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || ""
    this.senderName = process.env.BREVO_SENDER_NAME || "ACLA Missions"
  }

  private getVerificationEmailTemplate(name: string, verificationUrl: string): EmailTemplate {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - ACLA Missions</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .button { 
            display: inline-block; 
            background: #2563eb; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ACLA Missions</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}!</h2>
            <p>Thank you for creating your supporter account with ACLA Missions. We're excited to have you join our mission community!</p>
            <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            <p>If you didn't create this account, please ignore this email.</p>
            <p>Blessings,<br>The ACLA Missions Team</p>
          </div>
          <div class="footer">
            <p>© 2024 ACLA Missions. All rights reserved.</p>
            <p>This email was sent to verify your supporter account registration.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const textContent = `
      Welcome to ACLA Missions!

      Hello ${name}!

      Thank you for creating your supporter account with ACLA Missions. We're excited to have you join our mission community!

      To complete your registration and activate your account, please verify your email address by visiting this link:

      ${verificationUrl}

      This verification link will expire in 24 hours.

      If you didn't create this account, please ignore this email.

      Blessings,
      The ACLA Missions Team

      © 2024 ACLA Missions. All rights reserved.
    `

    return {
      subject: "Verify Your Email - ACLA Missions",
      htmlContent,
      textContent,
    }
  }

  async sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<BrevoEmailResponse> {
    try {
      // Validate API key and sender email are configured
      if (!this.apiKey) {
        console.warn("Brevo API key is not configured")
        return {
          success: false,
          message: "Email service is not properly configured. Please contact support.",
        }
      }

      if (!this.senderEmail) {
        console.warn("Brevo sender email is not configured")
        return {
          success: false,
          message: "Email service is not properly configured. Please contact support.",
        }
      }

      const verificationUrl = constructVerificationUrl(verificationToken)

      console.log("[v0] Sending verification email to:", email)
      console.log("[v0] Verification URL:", verificationUrl)
      console.log("[v0] Using sender:", this.senderEmail)

      const template = this.getVerificationEmailTemplate(name, verificationUrl)

      const response = await fetch(`${this.apiUrl}/smtp/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": this.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [
            {
              email: email,
              name: name,
            },
          ],
          subject: template.subject,
          htmlContent: template.htmlContent,
          textContent: template.textContent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.message || `HTTP ${response.status}: Failed to send email`
        console.error("[v0] Brevo API error:", errorMessage)
        throw new Error(errorMessage)
      }

      console.log("[v0] Email sent successfully")
      return {
        success: true,
        message: "Verification email sent successfully",
        data: data,
      }
    } catch (error: any) {
      console.error("[v0] Email sending error:", error.message || error)
      return {
        success: false,
        message: error.message || "Failed to send verification email",
      }
    }
  }

  generateVerificationToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

export const emailService = new EmailService()
