// filepath: /home/opencode/vagent/frontend/src/services/voice.ts
import React, { useState, useEffect, useCallback } from "react";
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  ConnectionState,
  ConnectionQuality,
  Track,
  createLocalAudioTrack,
  DataPacket_Kind,
  Participant,
} from "livekit-client";

// Configure LiveKit connection options
const LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://grant-gqi9u97k.livekit.cloud";

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
 * Creates a LiveKit voice command service instance.
 * Manages the Room object and connection lifecycle.
 */
export function createVoiceCommandService() {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
  });

  let internalState: VoiceCommandState = {
    isConnecting: false,
    isConnected: false,
    isListening: false,
    error: null,
  };

  // Connect to the LiveKit room - requires a token
  const connect = async (token: string, url: string) => {
    if (internalState.isConnected || internalState.isConnecting) {
      console.log("Already connected or connecting.");
      return room; // Return existing room if already connected/connecting
    }

    internalState = { ...internalState, isConnecting: true, error: null };

    try {
      // Remove previous listeners to avoid duplicates if connect is called again
      room.removeAllListeners();

      // Setup basic listeners for internal state
      room.on(RoomEvent.ConnectionStateChanged, (connectionState) => {
        internalState.isConnecting =
          connectionState === ConnectionState.Connecting;
        internalState.isConnected =
          connectionState === ConnectionState.Connected;
        if (
          connectionState === ConnectionState.Disconnected ||
          connectionState === ConnectionState.Failed
        ) {
          internalState.isListening = false; // Stop listening if disconnected
        }
      });
      room.on(RoomEvent.Disconnected, (reason) => {
        internalState = {
          isConnecting: false,
          isConnected: false,
          isListening: false,
          error: reason ? new Error(`Disconnected: ${reason}`) : null,
        };
      });

      // Connect
      await room.connect(url, token);

      // Pre-warm mic only after successful connection
      if (room.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(false);
      }
      internalState = {
        ...internalState,
        isConnecting: false,
        isConnected: true,
      };
      console.log("Service: Connected successfully.");
      return room; // Return the room object on success
    } catch (error: any) {
      console.error("Service: Failed to connect:", error);
      internalState = {
        isConnecting: false,
        isConnected: false,
        isListening: false,
        error,
      };
      throw error; // Re-throw error for the hook to catch
    }
  };

  // Start listening
  const startListening = async () => {
    if (!internalState.isConnected || !room.localParticipant) {
      throw new Error(
        "Service: Not connected or local participant unavailable."
      );
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      internalState.isListening = true;
      console.log("Service: Started listening.");
    } catch (error: any) {
      internalState.error = error;
      console.error("Service: Error starting listening:", error);
      throw error;
    }
  };

  // Stop listening
  const stopListening = async () => {
    if (!room.localParticipant) {
      console.warn(
        "Service: Cannot stop listening, local participant unavailable."
      );
      return; // Or throw error?
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(false);
      internalState.isListening = false;
      console.log("Service: Stopped listening.");
    } catch (error: any) {
      internalState.error = error;
      console.error("Service: Error stopping listening:", error);
      // Decide if this should throw or just log
    }
  };

  // Disconnect
  const disconnect = async () => {
    if (room) {
      await room.disconnect();
    }
    internalState = {
      isConnecting: false,
      isConnected: false,
      isListening: false,
      error: null,
    };
    console.log("Service: Disconnected.");
  };

  // Get the internal state (primarily for debugging or internal checks)
  const getState = () => ({ ...internalState });

  return {
    connect,
    disconnect,
    startListening,
    stopListening,
    getState,
    // Expose the room object for the hook to attach listeners
    getRoom: () => room,
  };
}

// Define state structure for the hook's reducer
interface HookState {
  isConnecting: boolean;
  isConnected: boolean;
  isListening: boolean;
  error: Error | null;
  transcript: string;
  connectionQuality: ConnectionQuality;
  room?: Room; // Store room instance
}

// Define actions for the reducer
type Action =
  | { type: "CONNECT_START" }
  | { type: "CONNECT_SUCCESS"; payload: Room }
  | { type: "CONNECT_FAILURE"; payload: Error }
  | { type: "DISCONNECTED" }
  | { type: "LISTEN_START" }
  | { type: "LISTEN_STOP" }
  | { type: "SET_ERROR"; payload: Error }
  | { type: "CLEAR_ERROR" }
  | { type: "UPDATE_TRANSCRIPT"; payload: string }
  | { type: "UPDATE_QUALITY"; payload: ConnectionQuality };

// Reducer function
const reducer = (state: HookState, action: Action): HookState => {
  switch (action.type) {
    case "CONNECT_START":
      return { ...state, isConnecting: true, error: null };
    case "CONNECT_SUCCESS":
      return {
        ...state,
        isConnecting: false,
        isConnected: true,
        room: action.payload,
        error: null,
      };
    case "CONNECT_FAILURE":
      return {
        ...state,
        isConnecting: false,
        isConnected: false,
        error: action.payload,
      };
    case "DISCONNECTED":
      return {
        ...state,
        isConnected: false,
        isListening: false,
        room: undefined,
        isConnecting: false,
      };
    case "LISTEN_START":
      return { ...state, isListening: true };
    case "LISTEN_STOP":
      return { ...state, isListening: false };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    case "UPDATE_TRANSCRIPT":
      return { ...state, transcript: action.payload };
    case "UPDATE_QUALITY":
      return { ...state, connectionQuality: action.payload };
    default:
      return state;
  }
};

/**
 * React hook for using voice commands, managing connection and state.
 */
export function useVoiceCommand(options: VoiceCommandOptions = {}) {
  const { token, onTranscript, onCommandDetected, onError } = options;

  const [state, dispatch] = React.useReducer(reducer, {
    isConnecting: false,
    isConnected: false,
    isListening: false,
    error: null,
    transcript: "",
    connectionQuality: ConnectionQuality.Unknown,
  });

  const serviceRef = React.useRef<ReturnType<
    typeof createVoiceCommandService
  > | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = createVoiceCommandService();
    // Cleanup on unmount
    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  // Handle connection based on token availability
  useEffect(() => {
    if (
      token &&
      serviceRef.current &&
      !state.isConnected &&
      !state.isConnecting
    ) {
      dispatch({ type: "CONNECT_START" });
      serviceRef.current
        .connect(token, LIVEKIT_URL)
        .then((room) => {
          dispatch({ type: "CONNECT_SUCCESS", payload: room });
        })
        .catch((error) => {
          dispatch({ type: "CONNECT_FAILURE", payload: error });
          if (onError) onError(error);
        });
    }
  }, [token, state.isConnected, state.isConnecting, onError]); // Re-run if token changes

  // Setup Room Event Listeners when connected
  useEffect(() => {
    const room = state.room;
    if (room) {
      const handleData = (
        payload: Uint8Array,
        participant?: RemoteParticipant
      ) => {
        const decoder = new TextDecoder();
        const message = decoder.decode(payload);
        try {
          const data = JSON.parse(message);
          if (data.type === "transcript" && onTranscript) {
            dispatch({ type: "UPDATE_TRANSCRIPT", payload: data.text });
            onTranscript(data.text);
          } else if (data.type === "command" && onCommandDetected) {
            onCommandDetected(data.command);
          }
        } catch (e) {
          console.error("Failed to parse data message:", e);
          dispatch({
            type: "SET_ERROR",
            payload: new Error("Failed to parse data"),
          });
          if (onError) onError(new Error(`Failed to parse message: ${e}`));
        }
      };

      const handleConnectionQuality = (
        quality: ConnectionQuality,
        participant?: Participant
      ) => {
        if (participant === room.localParticipant) {
          dispatch({ type: "UPDATE_QUALITY", payload: quality });
        }
      };

      const handleDisconnect = () => {
        dispatch({ type: "DISCONNECTED" });
      };

      const handleLocalTrackPublished = (
        trackPublication: any,
        participant: LocalParticipant
      ) => {
        if (trackPublication.kind === Track.Kind.Audio) {
          dispatch({ type: "LISTEN_START" });
        }
      };
      const handleLocalTrackUnpublished = (
        trackPublication: any,
        participant: LocalParticipant
      ) => {
        if (trackPublication.kind === Track.Kind.Audio) {
          dispatch({ type: "LISTEN_STOP" });
        }
      };

      room.on(RoomEvent.DataReceived, handleData);
      room.on(RoomEvent.ConnectionQualityChanged, handleConnectionQuality);
      room.on(RoomEvent.Disconnected, handleDisconnect);
      // Listen to track events to infer listening state
      room.localParticipant?.on(
        RoomEvent.LocalTrackPublished,
        handleLocalTrackPublished
      );
      room.localParticipant?.on(
        RoomEvent.LocalTrackUnpublished,
        handleLocalTrackUnpublished
      );

      // Cleanup listeners
      return () => {
        room.off(RoomEvent.DataReceived, handleData);
        room.off(RoomEvent.ConnectionQualityChanged, handleConnectionQuality);
        room.off(RoomEvent.Disconnected, handleDisconnect);
        room.localParticipant?.off(
          RoomEvent.LocalTrackPublished,
          handleLocalTrackPublished
        );
        room.localParticipant?.off(
          RoomEvent.LocalTrackUnpublished,
          handleLocalTrackUnpublished
        );
      };
    }
  }, [state.room, onTranscript, onCommandDetected, onError]); // Re-run if room instance changes

  // --- Actions exposed by the hook ---

  const startListening = useCallback(async () => {
    if (!serviceRef.current || !state.isConnected) {
      console.error("Hook: Cannot start listening, not connected.");
      dispatch({ type: "SET_ERROR", payload: new Error("Not connected") });
      return false;
    }
    try {
      await serviceRef.current.startListening();
      // State update is handled by track publication listener
      return true;
    } catch (error: any) {
      console.error("Hook: Error starting listening:", error);
      dispatch({ type: "SET_ERROR", payload: error });
      if (onError) onError(error);
      return false;
    }
  }, [state.isConnected, onError]);

  const stopListening = useCallback(async () => {
    if (!serviceRef.current) return false;
    try {
      await serviceRef.current.stopListening();
      // State update is handled by track unpublication listener
      return true;
    } catch (error: any) {
      console.error("Hook: Error stopping listening:", error);
      dispatch({ type: "SET_ERROR", payload: error });
      if (onError) onError(error);
      return false;
    }
  }, [onError]);

  const disconnect = useCallback(async () => {
    if (!serviceRef.current) return false;
    try {
      await serviceRef.current.disconnect();
      dispatch({ type: "DISCONNECTED" });
      return true;
    } catch (error: any) {
      console.error("Hook: Error disconnecting:", error);
      dispatch({ type: "SET_ERROR", payload: error });
      if (onError) onError(error);
      return false;
    }
  }, [onError]);

  // Note: connect is not exposed directly, connection is handled by token prop
  return {
    ...state,
    // connect, // Not needed - connection driven by token prop
    disconnect,
    startListening,
    stopListening,
  };
}
