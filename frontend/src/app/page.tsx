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
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Granteri 🌓</CardTitle>
          <CardDescription>
            Draft emails and generate call scripts with Granteri🌓.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="Enter your prompt here"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={handleDraftEmail}
              className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-md"
            >
              Draft Email
            </Button>
            <Button
              onClick={handleGenerateCallScript}
              className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-md"
            >
              Generate Call Script
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Draft</CardTitle>
          <CardDescription>
            View and edit the generated email draft.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              placeholder="Enter recipient email"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <Label htmlFor="email-draft">Email Draft</Label>
            <Textarea
              id="email-draft"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
            />
          </div>
          <Button
            disabled={true}
            className="bg-accent text-primary-foreground hover:bg-accent/80 rounded-md"
          >
            <Mail className="mr-2 h-4 w-4" />
            Send Email (Currently Unavailable)
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">
              Email sending functionality is currently unavailable as it is
              being migrated to a Python backend.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Call Script</CardTitle>
          <CardDescription>View the generated call script.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="call-script">Call Script</Label>
            <Textarea
              id="call-script"
              value={callScript}
              onChange={(e) => setCallScript(e.target.value)}
            />
          </div>
          <Button
            onClick={handlePlaceCall}
            className="bg-accent text-primary-foreground hover:bg-accent/80 rounded-md"
          >
            <Phone className="mr-2 h-4 w-4" />
            Place Call
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
