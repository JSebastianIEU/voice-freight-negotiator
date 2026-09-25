/**
 * Where the call is, and what the visitor could say next.
 *
 * The rep's script (docs/domain.md) has five steps. Four of them are exact now, because
 * the desk publishes them: a verified or rejected carrier, the first rate, the booking.
 * Only the first step is read off the transcript.
 */

import { type Carrier, type Load, loads } from "@/lib/catalog";
import { FILTER_REASON, type GuardianEvent, isRate, type RateEvent } from "@/lib/guardian";

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

/** The load the call is about now: the last one the desk named, else the one clicked. */
export function focusLoad(clicked: Load, events: GuardianEvent[]): Load {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    const id = e.type === "load.focus" ? e.loadId : isRate(e) ? e.loadId : undefined;
    if (id) return loads.find((l) => l.id === id) ?? clicked;
  }
  return clicked;
}

/** Where the haggling stands on one load, read from the desk's receipts. */
export type Round = "ask" | "counter" | "final" | "approved";

export type Next = { round: Round | null; line: string };

const say = (n: number) => `$${n.toLocaleString("en-US")}`;
const round50 = (n: number) => Math.round(n / 50) * 50;

/**
 * The line the visitor could say next, in English, filled with their data. During the
 * negotiation it follows the desk: open high, then split the difference with Alex's last
 * figure, then take the deal when Alex can book it or has said best and final.
 */
export function nextMove(stage: Stage, carrier: Carrier, load: Load, events: GuardianEvent[]): Next {
  const first = carrier.driver.split(" ")[0];
  switch (stage) {
    case "identify":
      return { round: null, line: `Yes, the ${load.origin.city} to ${load.destination.city} load. Is it still open?` };
    case "qualify":
      return { round: null, line: `This is ${first} with ${carrier.company}, MC ${carrier.mc}.` };
    case "load":
      return { round: null, line: `My ${carrier.equipment[0]} is empty in ${carrier.base.city} tomorrow morning.` };
    case "close":
      return { round: null, line: "Sounds good. I'll send the driver's info." };
    case "negotiate": {
      const here = events.filter(
        (e): e is RateEvent => isRate(e) && e.reason !== FILTER_REASON && (!e.loadId || e.loadId === load.id),
      );
      const last = here[here.length - 1];
      const offers = here.filter((e) => e.type === "rate.proposed");
      const lastOffer = offers[offers.length - 1];
      const highAsk = round50(load.prices.ceiling * 1.1);
      if (last?.type === "rate.accepted" && last.reason === "approved") {
        return { round: "approved", line: `Deal at ${say(last.amount)}. Go ahead and book it.` };
      }
      if (lastOffer?.reason === "best and final") {
        return { round: "final", line: `Alright, ${say(lastOffer.amount)} works. Book it.` };
      }
      if (!lastOffer || offers.length < 2) {
        return { round: "ask", line: `That's too low for this lane. I need ${say(highAsk)}.` };
      }
      const asks = here.filter((e) => e.type === "rate.rejected").map((e) => e.amount);
      const myAsk = asks.length ? asks[asks.length - 1] : highAsk;
      const middle = round50((myAsk + lastOffer.amount) / 2);
      return {
        round: "counter",
        line: `Meet me in the middle: ${say(Math.max(middle, lastOffer.amount + 50))} and it's booked.`,
      };
    }
  }
}
