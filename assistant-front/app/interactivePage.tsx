"use client";

// import { draftEmail } from "@/ai/flows/draft-email";
import { Mail, Phone } from "lucide-react";
import { useState } from "react";
import { draftEmail } from "../ai/flows/draft-email";
import { generateCallScript } from "../ai/flows/generate-call-script";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { sendEmail } from "../services/email";

// import { placeCall } from "/services/livekit";

export default function AgentTasks() {
  const [prompt, setPrompt] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [callScript, setCallScript] = useState("");
  const [recipient, setRecipient] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleDraftEmail = async () => {
    const result = await draftEmail({ prompt });
    setEmailDraft(result.emailDraft);
  };

  const handleGenerateCallScript = async () => {
    const result = await generateCallScript({ topic: prompt });
    setCallScript(result.script);
  };

  const handleSendEmail = async () => {
    if (!recipient) {
      alert("Please enter a recipient email address.");
      return;
    }
    if (!emailDraft) {
      alert("Please generate or write an email draft first.");
      return;
    }

    setIsSendingEmail(true);

    const lines = emailDraft.trim().split("\n");
    let subject = "Email from Granteri";
    let body = emailDraft;

    if (lines.length > 1 && lines[0].toLowerCase().startsWith("subject:")) {
      subject = lines[0].substring(8).trim();
      body = lines.slice(1).join("\n").trim();
    } else if (lines.length > 0 && !lines[0].includes("@") && lines[0].length < 100) {
      subject = lines[0].trim();
      body = lines.slice(1).join("\n").trim();
    }

    try {
      const result = await sendEmail({ to: recipient, subject, body });
      if (result.success) {
        alert("Email sent successfully!");
      } else {
        alert(`Email sending failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      alert("An unexpected error occurred while sending the email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>GRANTERI </CardTitle>
          <CardDescription>Draft emails and generate call scripts with Gemini.</CardDescription>
        </CardHeader>
        <CardContent className="card-content">
          <div className="input-group">
            <Label htmlFor="prompt" className="input-label">
              Prompt
            </Label>
            <Input
              id="prompt"
              placeholder="Describe what you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="shine-placeholder"
            />
          </div>
          <div className="btn-group">
            <Button onClick={handleDraftEmail} className="btn btn-primary">
              Draft Email
            </Button>
            <Button onClick={handleGenerateCallScript} className="btn btn-secondary">
              Generate Call Script
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-card">
        <CardHeader>
          <h2 className="section-header">Email Draft</h2>
          <p className="section-description">View, edit, and send the generated email draft.</p>
        </CardHeader>
        <CardContent className="card-content">
          <div className="input-group">
            <Label htmlFor="recipient" className="input-label">
              Recipient
            </Label>
            <Input
              id="recipient"
              placeholder="Enter recipient email address..."
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="shine-placeholder"
              required
            />
            <Label htmlFor="email-draft" className="input-label">
              Email Content (Edit if needed)
            </Label>
            <div className="gradient-border">
              <Textarea
                id="email-draft"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="Your generated email will appear here..."
                className="shine-placeholder"
                rows={10}
              />
            </div>
          </div>
          <Button
            onClick={handleSendEmail}
            disabled={isSendingEmail || !recipient || !emailDraft}
            className="btn btn-accent w-full mt-4"
          >
            <Mail className="mr-2 h-4 w-4" />
            {isSendingEmail ? "Sending..." : "Send Email"}
          </Button>
        </CardContent>
      </Card>

      <Card className="hover-card">
        <CardHeader>
          <h2 className="section-header">Call Script</h2>
          <p className="section-description">View the generated call script.</p>
        </CardHeader>
        <CardContent className="card-content">
          <div className="input-group">
            <Label htmlFor="call-script" className="input-label">
              Call Script
            </Label>
            <div className="gradient-border">
              <Textarea
                id="call-script"
                value={callScript}
                onChange={(e) => setCallScript(e.target.value)}
                placeholder="Your generated call script will appear here..."
                className="shine-placeholder"
              />
            </div>
          </div>
          {/* <Button onClick={handlePlaceCall} className="btn btn-primary">
            <span className="status-dot mr-2"></span>
            Place Call
          </Button> */}
        </CardContent>
      </Card>
    </div>
  );
}
