/**
 * Where the call is, and what the visitor could say next.
 *
 * The rep's script (docs/domain.md) has five steps. Four of them are exact now, because
 * the desk publishes them: a verified or rejected carrier, the first rate, the booking.
 * Only the first step is read off the transcript.
 */

import { type Carrier, type Lang, type Load, loads } from "@/lib/catalog";
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

/** What to do next: the round the negotiation is in, and a line to say while there is a script. */
export type Next = { round: Round | null; line: string | null };

/**
 * Up to the ID check and the truck, the visitor gets the line to say, in the page's
 * language, because those steps are the same on every call. Once money comes up, the
 * line goes away: the negotiation is theirs. The round still names where things stand.
 */
export function nextMove(stage: Stage, carrier: Carrier, load: Load, events: GuardianEvent[], lang: Lang): Next {
  const first = carrier.driver.split(" ")[0];
  const es = lang === "es";
  switch (stage) {
    case "identify":
      return {
        round: null,
        line: es
          ? `Sí, la carga de ${load.origin.city} a ${load.destination.city}. ¿Sigue abierta?`
          : `Yes, the ${load.origin.city} to ${load.destination.city} load. Is it still open?`,
      };
    case "qualify":
      return {
        round: null,
        line: es
          ? `Habla ${first}, de ${carrier.company}, MC ${carrier.mc}.`
          : `This is ${first} with ${carrier.company}, MC ${carrier.mc}.`,
      };
    case "load":
      return {
        round: null,
        line: es
          ? `Mi ${carrier.equipment[0]} está vacío en ${carrier.base.city} mañana por la mañana.`
          : `My ${carrier.equipment[0]} is empty in ${carrier.base.city} tomorrow morning.`,
      };
    case "close":
      return { round: null, line: null };
    case "negotiate": {
      const here = events.filter(
        (e): e is RateEvent => isRate(e) && e.reason !== FILTER_REASON && (!e.loadId || e.loadId === load.id),
      );
      const last = here[here.length - 1];
      const offers = here.filter((e) => e.type === "rate.proposed");
      const lastOffer = offers[offers.length - 1];
      if (last?.type === "rate.accepted" && last.reason === "approved") return { round: "approved", line: null };
      if (lastOffer?.reason === "best and final") return { round: "final", line: null };
      return { round: !lastOffer || offers.length < 2 ? "ask" : "counter", line: null };
    }
  }
}
