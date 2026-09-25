"use client";

import { useVoiceAssistant, type AgentState } from "@livekit/components-react";

import { useLang, type StringKey } from "@/lib/i18n";

/**
 * One line of text: what the pipeline is doing right now.
 *
 * The state comes from the worker through a participant attribute
 * (`lk.agent.state`): "listening" = VAD/STT consuming your audio, "thinking" =
 * waiting on the LLM, "speaking" = TTS audio playing. The core animates the same
 * state; this is the label for people who want the word.
 */
const LABELS: Record<AgentState, StringKey> = {
  disconnected: "statusDisconnected",
  connecting: "statusConnecting",
  "pre-connect-buffering": "statusConnecting",
  initializing: "statusJoining",
  idle: "statusIdle",
  listening: "statusListening",
  thinking: "statusThinking",
  speaking: "statusSpeaking",
  failed: "statusFailed",
};

export function AgentStatus() {
  const { state } = useVoiceAssistant();
  const { t } = useLang();
  const live = state === "listening" || state === "thinking" || state === "speaking";
  return (
    <span aria-live="polite" className="flex items-center gap-2 font-mono text-xs text-neutral-400">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          state === "failed" ? "bg-neutral-200" : live ? "bg-amber-300" : "bg-neutral-600"
        }`}
      />
      {t(LABELS[state])}
    </span>
  );
}
