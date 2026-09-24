"use client";

import {
  useLocalParticipant,
  useTrackVolume,
  useVoiceAssistant,
  type AgentState,
} from "@livekit/components-react";
import { type LocalAudioTrack, Track } from "livekit-client";

import { RateLane } from "@/components/RateLane";
import type { GuardianEvent } from "@/lib/guardian";
import type { LaneState } from "@/lib/lane/model";

/**
 * The lane fed by the live call. Must render inside a LiveKitRoom.
 *
 * Three real signals drive it:
 * - the agent's state attribute (listening / thinking / speaking), which the
 *   worker updates as its pipeline moves;
 * - the loudness of the agent's audio track, sampled from the same WebAudio
 *   analyser the BarVisualizer uses;
 * - the loudness of the local microphone, so the carrier's own voice shows up
 *   as the wave coming from the right.
 */
export function LiveLane({ events }: { events: GuardianEvent[] }) {
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
    <RateLane
      state={toLaneState(state)}
      agentLevel={shape(agentLevel)}
      userLevel={shape(userLevel)}
      events={events}
    />
  );
}

export function toLaneState(state: AgentState): LaneState {
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

/** Raw analyser volume is quiet and linear; lift it so speech fills the lane. */
function shape(level: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, level)) * 1.6);
}
