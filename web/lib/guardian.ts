/**
 * Guardian events: what the desk decided, as the agent publishes them.
 *
 * Transport: LiveKit data channel, topic `guardian`, one JSON object per message.
 * Producer: the Python worker (agent/src/freight_negotiator/guardian/events.py).
 * Kept in one place so both sides agree on the contract.
 */

export const GUARDIAN_TOPIC = "guardian";

export type RateEvent = {
  type: "rate.proposed" | "rate.rejected" | "rate.accepted";
  /** Amount in USD the desk offered, rejected or accepted. */
  amount: number;
  /** Short, speech-free explanation, e.g. "above what this load can pay". Never a bound. */
  reason?: string;
  loadId?: string;
  /** Seconds since epoch, set by the worker. */
  ts: number;
};

export type CarrierEvent = {
  type: "carrier.verified" | "carrier.rejected";
  mc?: string;
  company?: string;
  /** "not found" | "authority inactive" | "name mismatch" when rejected. */
  reason?: string;
  ts: number;
};

export type FocusEvent = { type: "load.focus"; loadId: string; ts: number };

/** The agent hung up: "booked" | "no deal" | "not verified" | "caller left". */
export type CallEvent = { type: "call.ended"; reason?: string; ts: number };

export type GuardianEvent = RateEvent | CarrierEvent | FocusEvent | CallEvent;

/** An event before the worker stamps it: any member of the union, minus `ts`. */
export type EventInput = GuardianEvent extends infer E ? (E extends GuardianEvent ? Omit<E, "ts"> : never) : never;

export const isRate = (e: GuardianEvent): e is RateEvent => e.type.startsWith("rate.");
export const isCarrier = (e: GuardianEvent): e is CarrierEvent => e.type.startsWith("carrier.");

/** The filter's own blocks are rate.rejected with this reason, no loadId. */
export const FILTER_REASON = "unvalidated amount in reply";

const RATE_TYPES = new Set(["rate.proposed", "rate.rejected", "rate.accepted"]);
const CARRIER_TYPES = new Set(["carrier.verified", "carrier.rejected"]);

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Decode one data-channel payload. Returns null for anything that is not a guardian event. */
export function parseGuardianEvent(payload: Uint8Array): GuardianEvent | null {
  try {
    const raw: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (typeof raw !== "object" || raw === null) return null;
    const o = raw as Record<string, unknown>;
    const ts = typeof o.ts === "number" ? o.ts : Date.now() / 1000;
    if (typeof o.type !== "string") return null;
    if (RATE_TYPES.has(o.type)) {
      if (typeof o.amount !== "number" || !Number.isFinite(o.amount)) return null;
      return {
        type: o.type as RateEvent["type"],
        amount: o.amount,
        reason: str(o.reason),
        loadId: str(o.loadId),
        ts,
      };
    }
    if (CARRIER_TYPES.has(o.type)) {
      return {
        type: o.type as CarrierEvent["type"],
        mc: str(o.mc),
        company: str(o.company),
        reason: str(o.reason),
        ts,
      };
    }
    if (o.type === "load.focus" && str(o.loadId)) {
      return { type: "load.focus", loadId: o.loadId as string, ts };
    }
    if (o.type === "call.ended") {
      return { type: "call.ended", reason: str(o.reason), ts };
    }
    return null;
  } catch {
    return null;
  }
}

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
