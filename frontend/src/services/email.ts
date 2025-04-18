// filepath: /home/opencode/vagent/frontend/src/services/email.ts
import axios from "axios";

// Base URL for API requests - can be configured via environment variables
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
  message?: string;
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
    // Make the API call to the backend
    const response = await axios.post(`${API_BASE_URL}/send-email/`, emailData);

    // Handle successful response
    return {
      success: true,
      message: response.data.message || "Email sent successfully",
    };
  } catch (error) {
    console.error("Error sending email:", error);

    // Handle Axios error with response
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "Failed to send email",
      };
    }

    // Handle other errors
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Processes a voice command to detect if it's related to sending an email
 *
 * @param text The transcribed voice command text
 * @returns Promise with the detection result
 */
export async function processVoiceCommand(text: string): Promise<{
  success: boolean;
  action?: string;
  detected?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/process-voice-command/`,
      { text }
    );

    return {
      success: true,
      action: response.data.action,
      detected: response.data.detected,
      message: response.data.message,
    };
  } catch (error) {
    console.error("Error processing voice command:", error);

    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "Failed to process voice command",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
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
