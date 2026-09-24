/**
 * Guardian events: what the price guardian decided, as the agent publishes them.
 *
 * Transport: LiveKit data channel, topic `guardian`, one JSON object per message.
 * Producer: the Python worker (milestone 3). Consumer: GuardianPanel.
 * Kept in one place so both sides agree on the contract.
 */

export const GUARDIAN_TOPIC = "guardian";

export type GuardianEventType = "rate.proposed" | "rate.rejected" | "rate.accepted";

export type GuardianEvent = {
  type: GuardianEventType;
  /** Amount in USD the LLM tried to say or accept. */
  amount: number;
  /** Short, speech-free explanation from the guardian, e.g. "too high". Optional. */
  reason?: string;
  /** Seconds since epoch, set by the worker. */
  ts: number;
};

const TYPES: ReadonlySet<string> = new Set<GuardianEventType>([
  "rate.proposed",
  "rate.rejected",
  "rate.accepted",
]);

/** Decode one data-channel payload. Returns null for anything that is not a guardian event. */
export function parseGuardianEvent(payload: Uint8Array): GuardianEvent | null {
  try {
    const raw: unknown = JSON.parse(new TextDecoder().decode(payload));
    if (typeof raw !== "object" || raw === null) return null;
    const o = raw as Record<string, unknown>;
    if (typeof o.type !== "string" || !TYPES.has(o.type)) return null;
    if (typeof o.amount !== "number" || !Number.isFinite(o.amount)) return null;
    return {
      type: o.type as GuardianEventType,
      amount: o.amount,
      reason: typeof o.reason === "string" ? o.reason : undefined,
      ts: typeof o.ts === "number" ? o.ts : Date.now() / 1000,
    };
  } catch {
    return null;
  }
}

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
