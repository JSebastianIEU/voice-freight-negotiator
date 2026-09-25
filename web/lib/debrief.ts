/**
 * What the call was worth, from the guardian's own receipts.
 *
 * Every number here comes from events the worker published during the call; the
 * private range comes from the catalog. Nothing is inferred from the transcript.
 */

import type { Load } from "@/lib/catalog";
import type { GuardianEvent } from "@/lib/guardian";

export type Debrief = {
  load: Load;
  booked: number | null;
  highestOffer: number | null;
  rejectedAsks: number[];
  filterBlocks: number;
  /** Ceiling minus the deal (or the highest offer); what Alex did not give away. */
  marginKept: number | null;
};

export function debriefOf(load: Load, events: GuardianEvent[]): Debrief {
  const booked = events.find((e) => e.type === "rate.accepted" && e.reason === "booked")?.amount ?? null;
  const offers = events
    .filter((e) => e.type === "rate.proposed" || (e.type === "rate.accepted" && e.reason === "approved"))
    .map((e) => e.amount);
  const highestOffer = offers.length ? Math.max(...offers) : null;
  const rejectedAsks = events
    .filter((e) => e.type === "rate.rejected" && e.reason !== "unvalidated amount in reply")
    .map((e) => e.amount);
  const filterBlocks = events.filter(
    (e) => e.type === "rate.rejected" && e.reason === "unvalidated amount in reply",
  ).length;
  const reference = booked ?? highestOffer;
  return {
    load,
    booked,
    highestOffer,
    rejectedAsks: [...new Set(rejectedAsks)],
    filterBlocks,
    marginKept: reference === null ? null : load.prices.ceiling - reference,
  };
}
