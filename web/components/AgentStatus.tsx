"use client";

import { useVoiceAssistant, type AgentState } from "@livekit/components-react";

/**
 * One line of text: what the pipeline is doing right now.
 *
 * The state comes from the worker through a participant attribute
 * (`lk.agent.state`): "listening" = VAD/STT consuming your audio, "thinking" =
 * waiting on the LLM, "speaking" = TTS audio playing. The lane animates the same
 * state; this is the label for people who want the word.
 */
const LABELS: Record<AgentState, string> = {
  disconnected: "agent not connected",
  connecting: "connecting",
  "pre-connect-buffering": "connecting",
  initializing: "agent joining",
  idle: "idle",
  listening: "listening",
  thinking: "thinking",
  speaking: "speaking",
  failed: "agent failed to join",
};

export function AgentStatus() {
  const { state } = useVoiceAssistant();
  const live = state === "listening" || state === "thinking" || state === "speaking";
  return (
    <span aria-live="polite" className="flex items-center gap-2 font-mono text-xs text-neutral-400">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          state === "failed" ? "bg-neutral-200" : live ? "bg-amber-300" : "bg-neutral-600"
        }`}
      />
      {LABELS[state]}
    </span>
  );
}
