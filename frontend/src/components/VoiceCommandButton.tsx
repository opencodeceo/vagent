"use client";

import React, { useState, useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceCommand } from "@/services/voice";
import { sendEmail } from "@/services/email";
import { useToast } from "@/hooks/use-toast";

interface VoiceCommandButtonProps {
  onGetToken: () => Promise<string | null>; // Make onGetToken required for simplicity now
}

export function VoiceCommandButton({ onGetToken }: VoiceCommandButtonProps) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [processing, setProcessing] = useState(false);

  const {
    isConnecting,
    isConnected,
    isListening,
    error,
    disconnect,
    startListening,
    stopListening,
    transcript,
  } = useVoiceCommand({
    token: token || undefined,
    onTranscript: (text) => {
      // console.log("Hook reported transcript:", text);
    },
    onCommandDetected: async (command) => {
      console.log("Hook reported command:", command);
      if (command.action === "send_email") {
        setProcessing(true);
        try {
          const result = await sendEmail({
            to: command.to || "",
            subject: command.subject || "Voice Generated Email",
            body: command.body || "",
          });
          if (result.success) {
            toast({
              title: "Email Sent",
              description: `Email successfully sent to ${command.to}`,
            });
          } else {
            throw new Error(result.error || "Unknown email sending error");
          }
        } catch (err: any) {
          console.error("Failed to send email via voice command:", err);
          toast({
            title: "Email Failed",
            description: `Failed to send email: ${err.message}`,
            variant: "destructive",
          });
        } finally {
          setProcessing(false);
        }
      }
    },
    onError: (err) => {
      console.error("Hook reported error:", err);
      setProcessing(false);
    },
  });

  const ensureToken = async () => {
    if (!token && !isFetchingToken) {
      setIsFetchingToken(true);
      try {
        const fetchedToken = await onGetToken();
        setToken(fetchedToken);
        if (!fetchedToken) {
          toast({
            title: "Token Error",
            description: "Failed to fetch token.",
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Token Error",
          description: "Error fetching token.",
          variant: "destructive",
        });
      } finally {
        setIsFetchingToken(false);
      }
    }
  };

  const toggleListening = async () => {
    await ensureToken();

    if (!isConnected) {
      console.warn("Not connected yet, waiting for connection...");
      toast({
        title: "Connecting...",
        description: "Please wait for the connection to establish.",
      });
      return;
    }

    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  useEffect(() => {
    if (error) {
      toast({
        title: "Connection/Voice Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const isDisabled = isConnecting || isFetchingToken || processing;

  return (
    <div className="flex flex-col items-center gap-4 mt-4">
      <Button
        onClick={toggleListening}
        variant={isListening ? "destructive" : "secondary"}
        disabled={isDisabled}
        className="rounded-full w-16 h-16 p-0 flex items-center justify-center shadow-lg"
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        {isConnecting || isFetchingToken ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>

      {processing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing command...
        </div>
      )}
      {isConnecting && (
        <div className="text-sm text-muted-foreground">Connecting...</div>
      )}
      {isFetchingToken && (
        <div className="text-sm text-muted-foreground">Fetching token...</div>
      )}
      {!isConnecting && !isConnected && error && (
        <div className="text-sm text-destructive">Connection failed</div>
      )}
      {isConnected && !isListening && !isConnecting && (
        <div className="text-sm text-muted-foreground">Click mic to speak</div>
      )}
      {isConnected && isListening && (
        <div className="text-sm text-primary">Listening...</div>
      )}
    </div>
  );
}
