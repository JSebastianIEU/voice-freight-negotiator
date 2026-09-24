"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useCallback, useState } from "react";

import { CallSession } from "@/components/CallSession";
import { RateLane } from "@/components/RateLane";
import { fetchConnectionDetails } from "@/lib/connection";
import type { ConnectionDetails } from "@/lib/types";

type Phase =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "connected"; details: ConnectionDetails }
  | { kind: "error"; message: string };

const NO_EVENTS: never[] = [];

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
 * appears at the moment the user expects it. Before the call, the lane is
 * drawn still: the picture is the same, nothing has happened on it yet.
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
    const requesting = phase.kind === "requesting";
    return (
      <div className="flex w-full flex-col gap-5">
        <div className="flex items-center justify-between font-mono text-xs text-neutral-500">
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-600" />
            {requesting ? "requesting a room" : "no call"}
          </span>
          <span>the lane is still until something happens on it</span>
        </div>

        <RateLane
          state={requesting ? "connecting" : "idle"}
          agentLevel={0}
          userLevel={0}
          events={NO_EVENTS}
        />

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={startCall}
            disabled={requesting}
            className="rounded-full bg-amber-300 px-6 py-2.5 font-mono text-sm font-medium text-neutral-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
          >
            {requesting ? "connecting…" : "start call"}
          </button>
          <p className="max-w-md text-sm text-neutral-500">
            You are the carrier. Use headphones so the agent does not hear itself.
          </p>
        </div>
        {phase.kind === "error" && (
          <p role="alert" className="font-mono text-xs text-amber-200">
            {phase.message}
          </p>
        )}
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
      className="flex w-full flex-col"
    >
      <CallSession roomName={roomName} />
    </LiveKitRoom>
  );
}
