/**
 * What the call was worth, from the desk's own receipts.
 *
 * Every number here comes from events the worker published during the call; the private
 * range comes from the catalog. Nothing is inferred from the transcript.
 */

import { type Load, loads } from "@/lib/catalog";
import { FILTER_REASON, type GuardianEvent, isRate, type RateEvent } from "@/lib/guardian";

export type Debrief = {
  load: Load;
  booked: number | null;
  /** Alex's offers in the order it made them. */
  offers: number[];
  /** What the caller asked that the desk refused (deduplicated, in order). */
  blockedAsks: number[];
  /** Sentences the output filter replaced. */
  filterBlocks: number;
  /** Every refusal: asks and acceptances the desk turned down, filtered sentences, failed ID checks. */
  blockedCount: number;
  verified: { company?: string; mc?: string } | null;
  identityRejected: boolean;
  highestOffer: number | null;
  /** Limit minus the deal (or the highest offer): what Alex did not give away. */
  marginKept: number | null;
};

/** The load the call ended up being about: booked, else last discussed, else the posting. */
function subjectLoad(fallback: Load, events: GuardianEvent[]): Load {
  const booked = events.find((e) => e.type === "rate.accepted" && e.reason === "booked") as
    | RateEvent
    | undefined;
  const lastRate = [...events].reverse().find((e) => isRate(e) && e.loadId) as RateEvent | undefined;
  const lastFocus = [...events].reverse().find((e) => e.type === "load.focus");
  const id =
    booked?.loadId ??
    lastRate?.loadId ??
    (lastFocus && lastFocus.type === "load.focus" ? lastFocus.loadId : undefined);
  return loads.find((l) => l.id === id) ?? fallback;
}

export function debriefOf(posted: Load, events: GuardianEvent[]): Debrief {
  const load = subjectLoad(posted, events);
  const rates = events.filter(isRate).filter((e) => !e.loadId || e.loadId === load.id);

  const booked = rates.find((e) => e.type === "rate.accepted" && e.reason === "booked")?.amount ?? null;
  const offers = rates
    .filter((e) => e.type === "rate.proposed" || (e.type === "rate.accepted" && e.reason === "approved"))
    .map((e) => e.amount);
  const blockedAsks = [
    ...new Set(
      rates.filter((e) => e.type === "rate.rejected" && e.reason !== FILTER_REASON).map((e) => e.amount),
    ),
  ];
  const filterBlocks = events.filter(
    (e) => e.type === "rate.rejected" && e.reason === FILTER_REASON,
  ).length;
  const deskRefusals = rates.filter((e) => e.type === "rate.rejected" && e.reason !== FILTER_REASON).length;
  const idRefusals = events.filter((e) => e.type === "carrier.rejected").length;
  const verifiedEv = events.find((e) => e.type === "carrier.verified");
  const verified = verifiedEv && verifiedEv.type === "carrier.verified" ? { company: verifiedEv.company, mc: verifiedEv.mc } : null;
  const identityRejected = !verified && events.some((e) => e.type === "carrier.rejected");
  const highestOffer = offers.length ? Math.max(...offers) : null;
  const reference = booked ?? highestOffer;
  return {
    load,
    booked,
    offers,
    blockedAsks,
    filterBlocks,
    blockedCount: deskRefusals + filterBlocks + idRefusals,
    verified,
    identityRejected,
    highestOffer,
    marginKept: reference === null ? null : load.prices.ceiling - reference,
  };
}
