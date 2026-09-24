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
import { LiveLane } from "@/components/LiveLane";
import { useGuardianEvents } from "@/lib/useGuardianEvents";

/**
 * Everything that exists only while connected. Rendered inside LiveKitRoom, so
 * every hook here has a room. Guardian events are read once and handed to both
 * the lane (markers) and the log (receipts).
 */
export function CallSession({ roomName }: { roomName: string }) {
  const events = useGuardianEvents();

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Plays every remote audio track (the agent's voice). Without it, silence. */}
      <RoomAudioRenderer />
      {/* Browsers block autoplay until a user gesture; shows a button only if needed. */}
      <StartAudio
        label="Click to enable audio"
        className="rounded-full border border-amber-300/60 px-4 py-2 font-mono text-xs text-amber-200"
      />

      <div className="flex items-center justify-between font-mono text-xs text-neutral-500">
        <AgentStatus />
        <span>room {roomName}</span>
      </div>

      <LiveLane events={events} />

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
