"use client";

import {
  useLocalParticipant,
  useTrackVolume,
  useVoiceAssistant,
  type AgentState,
} from "@livekit/components-react";
import { type LocalAudioTrack, Track } from "livekit-client";

import { Orb } from "@/components/Orb";
import type { GuardianEvent } from "@/lib/guardian";
import type { AgentPhase } from "@/lib/phase";

/**
 * The core fed by the live call. Must render inside a LiveKitRoom.
 *
 * Three real signals drive it:
 * - the agent's state attribute (listening / thinking / speaking), which the
 *   worker updates as its pipeline moves;
 * - the loudness of the agent's audio track (it emits);
 * - the loudness of the local microphone (it absorbs).
 */
export function LiveOrb({ events }: { events: GuardianEvent[] }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { microphoneTrack } = useLocalParticipant();

  const micTrack =
    microphoneTrack?.track?.kind === Track.Kind.Audio
      ? (microphoneTrack.track as LocalAudioTrack)
      : undefined;

  // Both hooks return 0 when there is no track yet, which is exactly "silence".
  const agentLevel = useTrackVolume(audioTrack);
  const userLevel = useTrackVolume(micTrack);

  return (
    <Orb
      phase={toPhase(state)}
      agentLevel={shape(agentLevel)}
      userLevel={shape(userLevel)}
      events={events}
    />
  );
}

export function toPhase(state: AgentState): AgentPhase {
  switch (state) {
    case "listening":
    case "thinking":
    case "speaking":
      return state;
    case "failed":
      return "failed";
    case "idle":
      return "idle";
    default:
      // disconnected / connecting / pre-connect-buffering / initializing
      return "connecting";
  }
}

/** Raw analyser volume is quiet and linear; lift it so speech moves the core. */
function shape(level: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, level)) * 1.6);
}
