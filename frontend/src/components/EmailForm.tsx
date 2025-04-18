// filepath: /home/opencode/vagent/frontend/src/components/EmailForm.tsx
"use client";

import React, { useState } from "react";
import { sendEmail, EmailRequest } from "@/services/email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const EmailForm: React.FC = () => {
  const [emailData, setEmailData] = useState<EmailRequest>({
    to: "",
    subject: "",
    body: "",
  });

  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEmailData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!emailData.to || !emailData.subject || !emailData.body) {
      setStatus({
        type: "error",
        message: "Please fill in all fields",
      });
      return;
    }

    // Set loading state
    setStatus({
      type: "loading",
      message: "Sending email...",
    });

    // Send email
    const result = await sendEmail(emailData);

    // Update status based on result
    if (result.success) {
      setStatus({
        type: "success",
        message: result.message || "Email sent successfully!",
      });
      // Clear form
      setEmailData({ to: "", subject: "", body: "" });
    } else {
      setStatus({
        type: "error",
        message: result.error || "Failed to send email",
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Send Email</CardTitle>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {status.message && (
            <Alert
              variant={
                status.type === "success"
                  ? "default"
                  : status.type === "error"
                  ? "destructive"
                  : "default"
              }
            >
              <AlertTitle>
                {status.type === "success"
                  ? "Success"
                  : status.type === "error"
                  ? "Error"
                  : "Info"}
              </AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label htmlFor="to" className="text-sm font-medium">
              To:
            </label>
            <Input
              type="email"
              id="to"
              name="to"
              value={emailData.to}
              onChange={handleChange}
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject:
            </label>
            <Input
              type="text"
              id="subject"
              name="subject"
              value={emailData.subject}
              onChange={handleChange}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="body" className="text-sm font-medium">
              Message:
            </label>
            <Textarea
              id="body"
              name="body"
              value={emailData.body}
              onChange={handleChange}
              rows={5}
              placeholder="Your message here..."
              required
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={status.type === "loading"}
          >
            {status.type === "loading" ? "Sending..." : "Send Email"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default EmailForm;
