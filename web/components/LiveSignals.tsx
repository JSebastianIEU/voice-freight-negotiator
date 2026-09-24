"use client";

import {
  useLocalParticipant,
  useTrackVolume,
  useVoiceAssistant,
  type AgentState,
} from "@livekit/components-react";
import { type LocalAudioTrack, Track } from "livekit-client";
import { useEffect } from "react";

import type { GuardianEvent } from "@/lib/guardian";
import type { AgentPhase } from "@/lib/phase";
import { useGuardianEvents } from "@/lib/useGuardianEvents";

export type Signals = {
  phase: AgentPhase;
  /** 0..1 */
  agentLevel: number;
  /** 0..1 */
  userLevel: number;
  events: GuardianEvent[];
};

export const SILENT: Signals = { phase: "idle", agentLevel: 0, userLevel: 0, events: [] };

/**
 * Reads the live call and reports it upward. Renders nothing.
 *
 * Why it exists: the core must be ONE canvas that survives connecting and
 * hanging up, so the move from the centre of the screen to the left column can
 * be animated instead of cut. LiveKit hooks only work inside LiveKitRoom, so
 * this component sits inside the room and lifts three real signals out of it:
 * the agent's state attribute, the loudness of the agent's audio track and the
 * loudness of the local microphone, plus every guardian verdict so far.
 */
export function LiveSignals({ onChange }: { onChange: (s: Signals) => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { microphoneTrack } = useLocalParticipant();
  const events = useGuardianEvents();

  const micTrack =
    microphoneTrack?.track?.kind === Track.Kind.Audio
      ? (microphoneTrack.track as LocalAudioTrack)
      : undefined;

  // Both hooks return 0 when there is no track yet, which is exactly "silence".
  const agentLevel = useTrackVolume(audioTrack);
  const userLevel = useTrackVolume(micTrack);

  useEffect(() => {
    onChange({
      phase: toPhase(state),
      agentLevel: shape(agentLevel),
      userLevel: shape(userLevel),
      events,
    });
  }, [onChange, state, agentLevel, userLevel, events]);

  return null;
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
  // The analyser reports NaN before its track exists; NaN would poison the model.
  if (!Number.isFinite(level)) return 0;
  return Math.min(1, Math.sqrt(Math.max(0, level)) * 1.6);
}
