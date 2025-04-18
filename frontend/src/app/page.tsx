"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { draftEmail } from "@/ai/flows/draft-email";
import { generateCallScript } from "@/ai/flows/generate-call-script";
// import {sendEmail} from '@/services/email';
import { placeCall } from "@/services/livekit";
import { useState } from "react";
import { Mail, Phone } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [callScript, setCallScript] = useState("");
  const [recipient, setRecipient] = useState("");

  const handleDraftEmail = async () => {
    const result = await draftEmail({ prompt });
    setEmailDraft(result.emailDraft);
  };

  const handleGenerateCallScript = async () => {
    const result = await generateCallScript({ topic: prompt });
    setCallScript(result.script);
  };

  // const handleSendEmail = async () => {
  //   if (!recipient) {
  //     alert('Please enter a recipient email.');
  //     return;
  //   }
  //   const result = await sendEmail(recipient, 'Email Draft', emailDraft);
  //   if (result.success) {
  //     alert('Email sent successfully!');
  //   } else {
  //     alert(`Email sending failed: ${result.errorMessage}`);
  //   }
  // };

  const handlePlaceCall = async () => {
    const result = await placeCall("123-456-7890", callScript);
    alert(`Call placed: ${result.status}`);
  };

  return (
    <div className="container">
      <Card className="hover-card">
        <CardHeader className="card-header">
          <h1 className="granteri-title">
            Granteri <span className="moon-icon">🌓</span>
          </h1>
          <p className="hero-description">
            Draft emails and generate call scripts with Granteri 🌓.\nEnhance
            your communication with AI-powered assistance.
          </p>
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
            <Button
              onClick={handleGenerateCallScript}
              className="btn btn-secondary"
            >
              Generate Call Script
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-card">
        <CardHeader>
          <h2 className="section-header">Email Draft</h2>
          <p className="section-description">
            View and edit the generated email draft.
          </p>
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
            />
            <Label htmlFor="email-draft" className="input-label">
              Email Content
            </Label>
            <div className="gradient-border">
              <Textarea
                id="email-draft"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="Your generated email will appear here..."
                className="shine-placeholder"
              />
            </div>
          </div>
          <Button disabled={true} className="btn btn-accent">
            <Mail className="mr-2 h-4 w-4" />
            Send Email (Currently Unavailable)
          </Button>
          <div>
            <p className="info-text">
              Email sending functionality is currently unavailable as it is
              being migrated to a Python backend.
            </p>
          </div>
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
          <Button onClick={handlePlaceCall} className="btn btn-primary">
            <span className="status-dot mr-2"></span>
            Place Call
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
