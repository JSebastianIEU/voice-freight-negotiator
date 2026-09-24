"use client";

import {
  DisconnectButton,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";

import { AgentStatus } from "@/components/AgentStatus";
import { CallLog } from "@/components/CallLog";
import type { GuardianEvent } from "@/lib/guardian";

/**
 * The right column while connected: status line, controls and the log.
 * Rendered inside LiveKitRoom, so every hook here has a room. The core itself
 * lives outside the room (see CallView) and gets its signals from LiveSignals.
 */
export function CallSession({ roomName, events }: { roomName: string; events: GuardianEvent[] }) {
  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      {/* Plays every remote audio track (the agent's voice). Without it, silence. */}
      <RoomAudioRenderer />
      {/* Browsers block autoplay until a user gesture; shows a button only if needed. */}
      <StartAudio
        label="Click to enable audio"
        className="rounded-full border border-amber-300/60 px-4 py-2 font-mono text-xs text-amber-200"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-neutral-500">
        <AgentStatus />
        <span className="truncate">room {roomName}</span>
      </div>

      <div className="flex items-center gap-3">
        <DisconnectButton className="rounded-full bg-neutral-100 px-5 py-2 font-mono text-xs font-medium text-neutral-950 hover:bg-white">
          hang up
        </DisconnectButton>
        <TrackToggle
          source={Track.Source.Microphone}
          className="rounded-full border border-neutral-700 px-4 py-2 font-mono text-xs text-neutral-300 hover:border-neutral-500"
        />
      </div>

      <CallLog events={events} />
    </div>
  );
}
