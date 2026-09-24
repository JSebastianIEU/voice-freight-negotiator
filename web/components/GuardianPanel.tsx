"use client";

import { useDataChannel } from "@livekit/components-react";
import { useCallback, useState } from "react";

import { GUARDIAN_TOPIC, parseGuardianEvent, usd, type GuardianEvent } from "@/lib/guardian";

const STYLE: Record<GuardianEvent["type"], { label: string; cls: string }> = {
  "rate.proposed": { label: "proposed", cls: "border-neutral-700 text-neutral-200" },
  "rate.rejected": { label: "blocked", cls: "border-red-500/60 bg-red-500/10 text-red-200" },
  "rate.accepted": {
    label: "accepted",
    cls: "border-emerald-500/60 bg-emerald-500/10 text-emerald-200",
  },
};

/**
 * Every price the LLM tried to say, and what the code decided about it.
 *
 * This is the screen the whole project is about: the transcript shows what the
 * agent *said*; this panel shows what it *tried* to say and was stopped. The
 * worker publishes one event per guardian decision on a data channel (reliable,
 * ordered, tiny payloads), separate from the audio path, so it costs nothing in
 * latency. Until milestone 3 wires the producer, the panel stays empty by design.
 */
export function GuardianPanel() {
  const [events, setEvents] = useState<GuardianEvent[]>([]);

  const onMessage = useCallback((msg: { payload: Uint8Array }) => {
    const ev = parseGuardianEvent(msg.payload);
    if (ev) setEvents((prev) => [...prev, ev]);
  }, []);
  useDataChannel(GUARDIAN_TOPIC, onMessage);

  const blocked = events.filter((e) => e.type === "rate.rejected").length;

  return (
    <section
      aria-label="Price guardian"
      className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-neutral-200">Price guardian</h2>
        <span className="text-xs text-neutral-500">
          {events.length === 0
            ? "no verdicts yet"
            : `${blocked} blocked of ${events.length} price${events.length === 1 ? "" : "s"}`}
        </span>
      </header>
      {events.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Every amount the agent wants to say goes through code first. Verdicts show up here
          as they happen.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {events.map((e, i) => (
            <li
              key={`${e.ts}-${i}`}
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${STYLE[e.type].cls}`}
            >
              <span className="font-mono tabular-nums">{usd.format(e.amount)}</span>
              <span className="flex items-center gap-2">
                {e.reason && <span className="text-xs opacity-80">{e.reason}</span>}
                <span className="text-xs uppercase tracking-wider">{STYLE[e.type].label}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
