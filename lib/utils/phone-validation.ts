export interface PhoneValidationResult {
  isValid: boolean
  formattedPhone?: string
  error?: string
}

export function validateEthiopianPhone(phoneNumber: string): PhoneValidationResult {
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
      error: "Phone number must be a valid Ethiopian number (format: 251xxxxxxxxx)",
    }
  }

  return {
    isValid: true,
    formattedPhone: cleaned,
  }
}

export function formatPhoneForDisplay(phoneNumber: string): string {
  const validation = validateEthiopianPhone(phoneNumber)
  if (validation.isValid && validation.formattedPhone) {
    const phone = validation.formattedPhone
    // Format as +251 9XX XXX XXX
    return `+${phone.substring(0, 3)} ${phone.substring(3, 4)}${phone.substring(4, 6)} ${phone.substring(6, 9)} ${phone.substring(9)}`
  }
  return phoneNumber
}

export function isValidEthiopianPhone(phoneNumber: string): boolean {
  return validateEthiopianPhone(phoneNumber).isValid
}

// Add the missing formatPhoneNumber function
export function formatPhoneNumber(phoneNumber: string): string {
  const validation = validateEthiopianPhone(phoneNumber)
  if (validation.isValid && validation.formattedPhone) {
    return validation.formattedPhone
  }
  return phoneNumber
}

// Add alias for validatePhoneNumber to match the import
export function validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
  return validateEthiopianPhone(phoneNumber)
}
