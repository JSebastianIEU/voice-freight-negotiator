"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useCallback, useState } from "react";

import { CallSession } from "@/components/CallSession";
import { LiveSignals, SILENT, type Signals } from "@/components/LiveSignals";
import { Orb } from "@/components/Orb";
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
 * The core is ONE canvas rendered here, outside the room, for the whole life
 * of the page. Before the call it sits centred; when the room connects the
 * right column opens and the core slides left (a flex-basis transition, no
 * remount, no cut). LiveSignals, inside the room, feeds it the live values.
 */
export function CallView() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [signals, setSignals] = useState<Signals>(SILENT);

  const startCall = useCallback(async () => {
    setPhase({ kind: "requesting" });
    try {
      const details = await fetchConnectionDetails();
      setPhase({ kind: "connected", details });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const endCall = useCallback(() => {
    setPhase({ kind: "idle" });
    setSignals(SILENT);
  }, []);
  // A failed WebRTC connection must not look like a normal hang-up.
  const failCall = useCallback((err: Error) => {
    setPhase({ kind: "error", message: `Could not connect: ${err.message}` });
    setSignals(SILENT);
  }, []);

  const connected = phase.kind === "connected";
  const requesting = phase.kind === "requesting";
  const orbPhase = connected ? signals.phase : requesting ? "connecting" : "idle";

  return (
    <div className="flex w-full flex-col gap-6 md:flex-row md:items-start">
      {/* Left: the core. Its share of the row animates from all of it to about half. */}
      <div
        className="flex min-w-0 flex-col items-center gap-4 transition-[flex-basis] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ flexBasis: connected ? "52%" : "100%", flexGrow: 0, flexShrink: 0 }}
      >
        <Orb
          phase={orbPhase}
          agentLevel={signals.agentLevel}
          userLevel={signals.userLevel}
          events={signals.events}
        />
        {!connected && (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={startCall}
              disabled={requesting}
              className="rounded-full bg-amber-300 px-6 py-2.5 font-mono text-sm font-medium text-neutral-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
            >
              {requesting ? "connecting…" : "start call"}
            </button>
            <p className="text-center text-sm text-neutral-500">
              You are the carrier. Use headphones so the agent does not hear itself.
            </p>
            {phase.kind === "error" && (
              <p role="alert" className="text-center font-mono text-xs text-amber-200">
                {phase.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: opens with the call. Overflow hidden so it can grow from nothing. */}
      <div
        className="min-w-0 overflow-hidden transition-[flex-basis,opacity] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ flexBasis: connected ? "48%" : "0%", flexGrow: 0, flexShrink: 0, opacity: connected ? 1 : 0 }}
        aria-hidden={!connected}
      >
        {connected && (
          <LiveKitRoom
            serverUrl={phase.details.serverUrl}
            token={phase.details.participantToken}
            connect
            audio // publish the microphone as soon as we join
            video={false}
            onDisconnected={endCall}
            onError={failCall}
            className="h-full"
          >
            <LiveSignals onChange={setSignals} />
            <CallSession roomName={phase.details.roomName} events={signals.events} />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}
