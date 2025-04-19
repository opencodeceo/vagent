"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceCommand } from "@/services/voice";
import { sendEmail } from "@/services/email";
import { useToast } from "@/hooks/use-toast";

// Define props type to include onGetToken
interface VoiceCommandButtonProps {
  onGetToken?: () => Promise<string | null>; // Optional function prop
}

export function VoiceCommandButton({ onGetToken }: VoiceCommandButtonProps) {
  // Destructure onGetToken
  const { toast } = useToast();
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);

  const {
    isConnecting,
    isConnected,
    isListening,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
  } = useVoiceCommand({
    onTranscript: (text) => {
      // This callback would be triggered by the backend sending transcription data
      // For now, we'll simulate it or rely on a backend implementation
      setTranscript(text);
      console.log("Transcript received:", text);
    },
    onCommandDetected: async (command) => {
      // This callback would be triggered by the backend sending command data
      console.log("Command detected:", command);
      if (command.action === "send_email") {
        setProcessing(true);
        try {
          const result = await sendEmail({
            to: command.to || "",
            subject: command.subject || "Voice Generated Email",
            body: command.body || "",
          });
          toast({
            title: "Email Sent",
            description: `Email successfully sent to ${command.to}`,
          });
        } catch (err: any) {
          // Explicitly type err as any or Error
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
      console.error("Voice command error:", err);
      toast({
        title: "Voice Error",
        description: err.message,
        variant: "destructive",
      });
      // Ensure states are reset on error
      setProcessing(false);
    },
  });

  const toggleListening = async () => {
    try {
      // fetch token and pass it into connect
      const token = onGetToken ? await onGetToken() : null;

      if (!isConnected) {
        await connect({ token: token || undefined }); // <-- pass token
      }
      if (isConnected) {
        if (isListening) {
          await stopListening();
        } else {
          await startListening();
        }
      } else {
        toast({
          title: "Connection Failed",
          description: "Could not connect after fetching token.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      // Explicitly type err as any or Error
      console.error("Toggle listening failed:", err);
      toast({
        title: "Mic Error",
        description: `Could not ${isListening ? "stop" : "start"} listening: ${
          err.message
        }`,
        variant: "destructive",
      });
    }
  };

  // Display connection/listening errors
  React.useEffect(() => {
    if (error) {
      toast({
        title: "Connection Error",
        description: `LiveKit connection failed: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <div className="flex flex-col items-center gap-4 mt-4">
      <Button
        onClick={toggleListening}
        variant={isListening ? "destructive" : "secondary"}
        disabled={isConnecting || processing}
        className="rounded-full w-16 h-16 p-0 flex items-center justify-center shadow-lg"
        aria-label={isListening ? "Stop listening" : "Start listening"}
      >
        {isConnecting ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>

      {/* Optional: Display transcript or status */}
      {/* {transcript && (
        <div className="text-sm bg-muted p-2 rounded-md max-w-md text-center">
          {transcript}
        </div>
      )} */}

      {processing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing command...
        </div>
      )}
      {isConnecting && (
        <div className="text-sm text-muted-foreground">Connecting...</div>
      )}
      {!isConnecting && !isConnected && error && (
        <div className="text-sm text-destructive">Connection failed</div>
      )}
      {!isConnecting && isConnected && !isListening && (
        <div className="text-sm text-muted-foreground">Click mic to speak</div>
      )}
      {isConnected && isListening && (
        <div className="text-sm text-primary">Listening...</div>
      )}
    </div>
  );
}
