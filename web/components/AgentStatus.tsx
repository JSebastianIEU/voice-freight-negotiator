"use client";

import { BarVisualizer, useVoiceAssistant, type AgentState } from "@livekit/components-react";

/**
 * Human-readable label for each agent state.
 *
 * The state comes from the worker through a participant attribute
 * (`lk.agent.state`), so this badge reflects what the pipeline is really doing:
 * "listening" = VAD/STT are consuming your audio, "thinking" = waiting on the
 * LLM, "speaking" = TTS audio is playing. Watching it flip is the quickest way
 * to feel where the latency goes.
 */
const LABELS: Record<AgentState, string> = {
  disconnected: "Agent not connected",
  connecting: "Connecting…",
  "pre-connect-buffering": "Connecting…",
  initializing: "Agent joining the room…",
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  failed: "Agent failed to join",
};

const COLORS: Partial<Record<AgentState, string>> = {
  listening: "bg-emerald-500",
  thinking: "bg-amber-400",
  speaking: "bg-sky-500",
  failed: "bg-red-500",
};

export function AgentStatus() {
  const { state, audioTrack } = useVoiceAssistant();
  const dot = COLORS[state] ?? "bg-neutral-500";

  return (
    <section
      aria-live="polite"
      className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6"
    >
      <div className="flex items-center gap-2 text-sm text-neutral-300">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
        {LABELS[state]}
      </div>
      {/* The bars follow the agent's own audio track, so they move only when it speaks. */}
      <BarVisualizer
        state={state}
        trackRef={audioTrack}
        barCount={7}
        options={{ minHeight: 12 }}
        className="h-24 w-64"
      />
    </section>
  );
}
