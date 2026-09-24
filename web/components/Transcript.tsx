"use client";

import { useLocalParticipant, useTranscriptions } from "@livekit/components-react";
import { useEffect, useRef } from "react";

/**
 * Live transcript of both sides of the call.
 *
 * Where the text comes from: the worker publishes transcriptions as LiveKit text
 * streams on the `lk.transcription` topic, one stream per utterance. The user's
 * words come from STT as they are recognised (interim, then final); the agent's
 * words are the LLM output, synchronised with the TTS playback so text does not
 * run ahead of the voice. `useTranscriptions` accumulates each stream for us.
 *
 * Who said what: a stream carries the identity of the participant it belongs
 * to. Ours is the local participant; everything else is the agent.
 */
export function Transcript() {
  const streams = useTranscriptions();
  const { localParticipant } = useLocalParticipant();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [streams]);

  return (
    <section
      aria-label="Transcript"
      className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
    >
      {streams.length === 0 && (
        <p className="text-sm text-neutral-500">The transcript appears here as you talk.</p>
      )}
      {streams.map((s) => {
        const mine = s.participantInfo.identity === localParticipant.identity;
        // "false" while STT is still revising the sentence, "true" once it is final.
        const interim = s.streamInfo.attributes?.["lk.transcription_final"] === "false";
        return (
          <div
            key={s.streamInfo.id}
            className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
          >
            <span className="text-[11px] uppercase tracking-wider text-neutral-500">
              {mine ? "You (carrier)" : "Agent"}
            </span>
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                mine ? "bg-emerald-500/15 text-emerald-100" : "bg-neutral-800 text-neutral-100"
              } ${interim ? "opacity-60" : ""}`}
            >
              {s.text}
            </p>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </section>
  );
}
