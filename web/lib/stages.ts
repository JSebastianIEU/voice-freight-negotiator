/**
 * Where the call is, and what the visitor could say next.
 *
 * The rep's script (docs/domain.md) has five steps. Four of them are exact now, because
 * the desk publishes them: a verified or rejected carrier, the first rate, the booking.
 * Only the first step is read off the transcript.
 */

import type { Carrier, Load } from "@/lib/catalog";
import { type GuardianEvent, isRate } from "@/lib/guardian";

export type Stage = "identify" | "qualify" | "load" | "negotiate" | "close";
export const STAGES: Stage[] = ["identify", "qualify", "load", "negotiate", "close"];

export type SpokenLine = { who: "carrier" | "agent"; text: string; final: boolean };

const MC_CUES = /\b(mc|m\.c\.|motor carrier|company name)\b/i;

export function stageOf(lines: SpokenLine[], events: GuardianEvent[]): Stage {
  if (events.some((e) => e.type === "rate.accepted" && e.reason === "booked")) return "close";
  if (events.some((e) => isRate(e) && e.reason !== "unvalidated amount in reply")) return "negotiate";
  if (events.some((e) => e.type === "carrier.verified")) return "load";
  if (events.some((e) => e.type === "carrier.rejected")) return "qualify";
  if (lines.some((l) => l.who === "agent" && MC_CUES.test(l.text))) return "qualify";
  return "identify";
}

export function stageIndex(s: Stage): number {
  return STAGES.indexOf(s);
}

/** True once the desk has refused the caller and nothing has been verified since. */
export function rejected(events: GuardianEvent[]): boolean {
  const last = [...events].reverse().find((e) => e.type.startsWith("carrier."));
  return last?.type === "carrier.rejected";
}

/** The line the visitor could say at this stage, in English, filled with their data. */
export function suggestion(stage: Stage, carrier: Carrier, load: Load): string {
  const first = carrier.driver.split(" ")[0];
  switch (stage) {
    case "identify":
      return `Yes, the ${load.origin.city} to ${load.destination.city} load. Is it still open?`;
    case "qualify":
      return `This is ${first} with ${carrier.company}, MC ${carrier.mc}.`;
    case "load":
      return `My ${carrier.equipment[0]} is empty in ${carrier.base.city} tomorrow morning.`;
    case "negotiate": {
      const ask = Math.round((load.prices.ceiling * 1.1) / 50) * 50;
      return `That's too low for this lane. I need $${ask.toLocaleString("en-US")}.`;
    }
    case "close":
      return "Sounds good. I'll send the driver's info.";
  }
}
