"use client";

import { useLocalParticipant, useTranscriptions } from "@livekit/components-react";
import { useEffect, useMemo, useRef } from "react";

import { type GuardianEvent, usd } from "@/lib/guardian";

type Line =
  | { kind: "carrier" | "agent"; id: string; at: number; text: string; interim: boolean }
  | { kind: "guardian"; id: string; at: number; event: GuardianEvent };

const VERDICT: Record<GuardianEvent["type"], string> = {
  "rate.proposed": "proposed",
  "rate.rejected": "blocked",
  "rate.accepted": "accepted",
};

/**
 * One log for the whole call: what each side said and what the guardian decided,
 * in time order. The transcript is the article's source of quotes; the verdict
 * lines are the receipts. Kept deliberately plain, monospace, like a terminal.
 */
export function CallLog({ events }: { events: GuardianEvent[] }) {
  const streams = useTranscriptions();
  const { localParticipant } = useLocalParticipant();
  const bottomRef = useRef<HTMLDivElement>(null);

  const lines = useMemo<Line[]>(() => {
    const spoken: Line[] = streams.map((s) => ({
      kind: s.participantInfo.identity === localParticipant.identity ? "carrier" : "agent",
      id: s.streamInfo.id,
      at: s.streamInfo.timestamp / 1000,
      text: s.text,
      interim: s.streamInfo.attributes?.["lk.transcription_final"] === "false",
    }));
    const verdicts: Line[] = events.map((e, i) => ({
      kind: "guardian",
      id: `g-${i}-${e.ts}`,
      at: e.ts,
      event: e,
    }));
    return [...spoken, ...verdicts].sort((a, b) => a.at - b.at);
  }, [streams, events, localParticipant.identity]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines.length]);

  return (
    <section
      aria-label="Call log"
      className="flex max-h-72 flex-col gap-1.5 overflow-y-auto border-t border-neutral-800 pt-4 font-mono text-[13px] leading-relaxed"
    >
      {lines.length === 0 && (
        <p className="text-neutral-600">log — the call appears here as it happens</p>
      )}
      {lines.map((l) => {
        if (l.kind === "guardian") {
          const e = l.event;
          const tone =
            e.type === "rate.accepted"
              ? "text-amber-300"
              : e.type === "rate.rejected"
                ? "text-neutral-400"
                : "text-neutral-300";
          return (
            <p key={l.id} className={`grid grid-cols-[6.5rem_1fr] gap-3 ${tone}`}>
              <span className="text-neutral-500">guardian</span>
              <span>
                {usd.format(e.amount)} {VERDICT[e.type]}
                {e.reason ? ` · ${e.reason}` : ""}
              </span>
            </p>
          );
        }
        return (
          <p
            key={l.id}
            className={`grid grid-cols-[6.5rem_1fr] gap-3 ${l.interim ? "opacity-50" : ""} ${
              l.kind === "agent" ? "text-neutral-100" : "text-neutral-300"
            }`}
          >
            <span className="text-neutral-500">{l.kind}</span>
            <span>{l.text}</span>
          </p>
        );
      })}
      <div ref={bottomRef} />
    </section>
  );
}
