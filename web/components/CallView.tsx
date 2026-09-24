"use client";

import {
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useCallback, useState } from "react";

import { AgentStatus } from "@/components/AgentStatus";
import { fetchConnectionDetails } from "@/lib/connection";
import type { ConnectionDetails } from "@/lib/types";

type Phase =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "connected"; details: ConnectionDetails }
  | { kind: "error"; message: string };

/**
 * The whole call screen. Owns the connection lifecycle:
 *
 *   idle ──click──▶ requesting (POST /api/token) ──▶ connected (LiveKitRoom mounts)
 *                                                       │ hang up / agent leaves
 *                                                       ▼
 *                                                     idle
 *
 * LiveKitRoom only mounts once we hold a token, so no WebRTC connection is
 * attempted before the user asked for one and the mic permission prompt
 * appears at the moment the user expects it.
 */
export function CallView() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const startCall = useCallback(async () => {
    setPhase({ kind: "requesting" });
    try {
      const details = await fetchConnectionDetails();
      setPhase({ kind: "connected", details });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const endCall = useCallback(() => setPhase({ kind: "idle" }), []);
  // A failed WebRTC connection must not look like a normal hang-up.
  const failCall = useCallback(
    (err: Error) => setPhase({ kind: "error", message: `Could not connect: ${err.message}` }),
    [],
  );

  if (phase.kind !== "connected") {
    return (
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={startCall}
          disabled={phase.kind === "requesting"}
          className="rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
        >
          {phase.kind === "requesting" ? "Connecting…" : "Start call"}
        </button>
        {phase.kind === "error" && (
          <p role="alert" className="max-w-md text-center text-sm text-red-400">
            {phase.message}
          </p>
        )}
        <p className="max-w-md text-center text-sm text-neutral-400">
          You are the carrier. The agent answers, you negotiate. Use headphones so the
          agent does not hear itself.
        </p>
      </div>
    );
  }

  const { serverUrl, participantToken, roomName } = phase.details;
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={participantToken}
      connect
      audio // publish the microphone as soon as we join
      video={false}
      onDisconnected={endCall}
      onError={failCall}
      className="flex w-full flex-col gap-6"
    >
      {/* Plays every remote audio track (the agent's voice). Without it, silence. */}
      <RoomAudioRenderer />
      {/* Browsers block autoplay until a user gesture; this shows a button only if needed. */}
      <StartAudio label="Click to enable audio" />

      <AgentStatus />

      <div className="flex items-center justify-center gap-3">
        <TrackToggle
          source={Track.Source.Microphone}
          className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        />
        <DisconnectButton className="rounded-full bg-red-500/90 px-5 py-2 text-sm font-medium text-white hover:bg-red-500">
          Hang up
        </DisconnectButton>
      </div>

      <p className="text-center text-xs text-neutral-500">room {roomName}</p>
    </LiveKitRoom>
  );
}
