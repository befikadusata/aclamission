interface AfroMessageResponse {
  success: boolean
  message: string
  data?: any
}

class SMSService {
  private identifierId: string
  private senderName: string
  private apiUrl: string
  private bearerToken: string

  constructor() {
    this.identifierId = process.env.AFRO_MESSAGE_IDENTIFIER_ID || ""
    this.senderName = process.env.AFRO_MESSAGE_SENDER || "ACLA"
    this.apiUrl = "https://api.afromessage.com/api/send"
    this.bearerToken = process.env.AFRO_MESSAGE_BEARER_TOKEN || ""
  }

  async sendVerificationCode(phoneNumber: string, code: string): Promise<AfroMessageResponse> {
    try {
      // Validate phone number format
      const validationResult = this.validatePhoneNumber(phoneNumber)
      if (!validationResult.isValid) {
        return {
          success: false,
          message: validationResult.error || "Invalid phone number format",
        }
      }

      const message = `Your ACLA Missions verification code is: ${code}. This code will expire in 10 minutes.`

      // Use the validated phone number
      const formattedPhone = validationResult.formattedPhone!

      // Build the API URL with query parameters as per AfroMessage documentation
      const url = new URL(this.apiUrl)
      url.searchParams.append("from", this.identifierId)
      url.searchParams.append("sender", this.senderName)
      url.searchParams.append("to", formattedPhone)
      url.searchParams.append("message", message)

      console.log(`Sending SMS to ${formattedPhone} via AfroMessage API`)

      const response = await fetch(url.toString(), {
        method: "GET", // AfroMessage uses GET method as per documentation
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.bearerToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Failed to send SMS`)
      }

      console.log("SMS sent successfully via AfroMessage:", data)

      return {
        success: true,
        message: "Verification code sent successfully",
        data: data,
      }
    } catch (error: any) {
      console.error("AfroMessage SMS sending error:", error)
      return {
        success: false,
        message: error.message || "Failed to send verification code",
      }
    }
  }

  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  validatePhoneNumber(phoneNumber: string): {
    isValid: boolean
    formattedPhone?: string
    error?: string
  } {
    if (!phoneNumber) {
      return {
        isValid: false,
        error: "Phone number is required",
      }
    }

    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "")

    // Handle Ethiopian phone numbers - convert to 251xxxxxxxxx format
    if (cleaned.startsWith("0")) {
      // Replace leading 0 with 251
      cleaned = "251" + cleaned.substring(1)
    } else if (cleaned.startsWith("9") && cleaned.length === 9) {
      // Add country code for 9-digit numbers starting with 9
      cleaned = "251" + cleaned
    } else if (!cleaned.startsWith("251")) {
      // Add country code if not present
      cleaned = "251" + cleaned
    }

    // Validate using the required format: 251 followed by 9 digits
    const phoneRegex = /^251\d{9}$/
    if (!phoneRegex.test(cleaned)) {
      return {
        isValid: false,
        error: "Phone number must be in format 251xxxxxxxxx (Ethiopian numbers only)",
      }
    }

    return {
      isValid: true,
      formattedPhone: cleaned,
    }
  }

  formatPhoneNumber(phoneNumber: string): string {
    const validation = this.validatePhoneNumber(phoneNumber)
    if (validation.isValid) {
      return validation.formattedPhone!
    }
    throw new Error(validation.error || "Invalid phone number")
  }

  // Method to validate if we have the required configuration
  isConfigured(): boolean {
    return !!(this.identifierId && this.senderName && this.bearerToken)
  }

  // Method to get configuration status for debugging
  getConfigurationStatus(): {
    hasIdentifierId: boolean
    hasSenderName: boolean
    hasBearerToken: boolean
    isFullyConfigured: boolean
  } {
    return {
      hasIdentifierId: !!this.identifierId,
      hasSenderName: !!this.senderName,
      hasBearerToken: !!this.bearerToken,
      isFullyConfigured: this.isConfigured(),
    }
  }
}

export const smsService = new SMSService()
