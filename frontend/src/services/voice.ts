// filepath: /home/opencode/vagent/frontend/src/services/voice.ts
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  ConnectionState,
  ConnectionQuality,
  Track,
  createLocalAudioTrack,
} from "livekit-client";
import { useState, useEffect, useCallback } from "react";

// Configure LiveKit connection options
const LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

interface VoiceCommandOptions {
  roomName?: string;
  participantName?: string;
  token?: string; // JWT token for authentication
  onTranscript?: (text: string) => void; // Callback for transcription updates
  onCommandDetected?: (command: any) => void; // Callback for detected commands
  onError?: (error: Error) => void;
}

interface VoiceCommandState {
  isConnecting: boolean;
  isConnected: boolean;
  isListening: boolean;
  error: Error | null;
  transcript: string;
  connectionQuality: ConnectionQuality;
}

/**
 * Fetches a LiveKit token from the backend
 * @param roomName The room to connect to
 * @param participantName The participant name
 */
export async function fetchLiveKitToken(
  roomName: string = "voice-command",
  participantName: string = "user"
): Promise<string> {
  try {
    const response = await fetch(
      `/api/livekit-token?room=${roomName}&username=${participantName}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch token: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Error fetching LiveKit token:", error);
    throw error;
  }
}

/**
 * Processes a voice command using the backend API
 * @param text The transcribed text to process
 */
export async function processVoiceCommand(text: string): Promise<any> {
  try {
    const response = await fetch("/api/process-voice-command/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to process command: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error processing voice command:", error);
    throw error;
  }
}

/**
 * Creates a LiveKit voice command service instance
 */
export function createVoiceCommandService() {
  // Create a new room and state
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  let state: VoiceCommandState = {
    isConnecting: false,
    isConnected: false,
    isListening: false,
    error: null,
    transcript: "",
    connectionQuality: ConnectionQuality.Unknown,
  };

  let options: VoiceCommandOptions = {};

  // Set up event listeners
  const setupRoomListeners = () => {
    room.on(RoomEvent.Connected, () => {
      state = { ...state, isConnected: true, isConnecting: false };
      console.log("Connected to LiveKit room:", room.name);
    });

    room.on(RoomEvent.Disconnected, () => {
      state = { ...state, isConnected: false, isListening: false };
      console.log("Disconnected from LiveKit room");
    });

    room.on(
      RoomEvent.ConnectionQualityChanged,
      (quality: ConnectionQuality) => {
        state = { ...state, connectionQuality: quality };
      }
    );

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      // Handle any transcription tracks that might come from the server
      if (track.kind === Track.Kind.Data) {
        // Assume data track contains transcript data
        // Implementation would depend on how your backend sends transcript data
      }
    });

    room.on(RoomEvent.Error, (error) => {
      state = { ...state, error };
      if (options.onError) {
        options.onError(error);
      }
    });
  };

  // Connect to the LiveKit room
  const connect = async (opts: VoiceCommandOptions) => {
    options = { ...opts };
    state = { ...state, isConnecting: true, error: null };

    try {
      const roomName = opts.roomName || "voice-command";
      const participantName = opts.participantName || "user";
      const token =
        opts.token || (await fetchLiveKitToken(roomName, participantName));

      // Set up room listeners before connecting
      setupRoomListeners();

      // Connect to the room
      await room.connect(LIVEKIT_URL, token);

      // Pre-warm the microphone permission
      if (room.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(false);
      }

      return true;
    } catch (error: any) {
      state = {
        ...state,
        isConnecting: false,
        error,
      };

      if (options.onError) {
        options.onError(error);
      }

      return false;
    }
  };

  // Start listening for voice commands
  const startListening = async () => {
    if (!state.isConnected) {
      throw new Error("Not connected to LiveKit room");
    }

    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      state = { ...state, isListening: true };

      // This would normally also start our server-side transcription
      // For now, let's assume the server handles this once the mic is enabled

      return true;
    } catch (error: any) {
      state = { ...state, error };

      if (options.onError) {
        options.onError(error);
      }

      return false;
    }
  };

  // Stop listening for voice commands
  const stopListening = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(false);
      state = { ...state, isListening: false };
      return true;
    } catch (error: any) {
      state = { ...state, error };

      if (options.onError) {
        options.onError(error);
      }

      return false;
    }
  };

  // Disconnect from the room
  const disconnect = async () => {
    try {
      room.disconnect();
      state = {
        ...state,
        isConnected: false,
        isListening: false,
      };
      return true;
    } catch (error: any) {
      state = { ...state, error };

      if (options.onError) {
        options.onError(error);
      }

      return false;
    }
  };

  // Get the current state
  const getState = () => ({ ...state });

  return {
    connect,
    disconnect,
    startListening,
    stopListening,
    getState,
    room,
  };
}

/**
 * React hook for using voice commands
 */
export function useVoiceCommand(options: VoiceCommandOptions = {}) {
  const [state, setState] = useState<VoiceCommandState>({
    isConnecting: false,
    isConnected: false,
    isListening: false,
    error: null,
    transcript: "",
    connectionQuality: ConnectionQuality.Unknown,
  });

  // Service ref to keep it stable between renders
  const serviceRef = React.useRef<ReturnType<
    typeof createVoiceCommandService
  > | null>(null);

  // Initialize the service
  useEffect(() => {
    const service = createVoiceCommandService();
    serviceRef.current = service;

    // Clean up on unmount
    return () => {
      if (service && state.isConnected) {
        service.disconnect();
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (!serviceRef.current) return false;
    setState((prev) => ({ ...prev, isConnecting: true }));

    const success = await serviceRef.current.connect(options);

    setState((prev) => ({
      ...prev,
      isConnecting: false,
      isConnected: success,
      error: success ? null : new Error("Failed to connect"),
    }));

    return success;
  }, [options]);

  const disconnect = useCallback(async () => {
    if (!serviceRef.current) return false;

    const success = await serviceRef.current.disconnect();

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isListening: false,
    }));

    return success;
  }, []);

  const startListening = useCallback(async () => {
    if (!serviceRef.current) return false;
    if (!state.isConnected) {
      await connect();
    }

    const success = await serviceRef.current.startListening();

    setState((prev) => ({
      ...prev,
      isListening: success,
    }));

    return success;
  }, [state.isConnected, connect]);

  const stopListening = useCallback(async () => {
    if (!serviceRef.current) return false;

    const success = await serviceRef.current.stopListening();

    setState((prev) => ({
      ...prev,
      isListening: false,
    }));

    return success;
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    startListening,
    stopListening,
  };
}
