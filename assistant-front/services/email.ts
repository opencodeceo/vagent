// filepath: /home/opencode/vagent/frontend/src/services/email.ts
import axios from "axios";

// Base URL for API requests
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

/**
 * Interface for email request data
 */
export interface EmailRequest {
  to: string;
  subject: string;
  body: string;
}

/**
 * Interface for email response data
 */
export interface EmailResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Asynchronously sends an email using the backend API
 *
 * @param emailData The email data including to, subject, and body
 * @returns A promise that resolves to an EmailResponse object
 */
export async function sendEmail(
  emailData: EmailRequest
): Promise<EmailResponse> {
  try {
    const response = await axios.post(`${API_BASE_URL}/send-email/`, emailData);
    return {
      success: true,
      message: response.data.message,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        message: "Failed to send email",
        error: error.response.data.error || error.message,
      };
    }
    return {
      success: false,
      message: "Failed to send email",
      error: "Unknown error occurred",
    };
  }
}
