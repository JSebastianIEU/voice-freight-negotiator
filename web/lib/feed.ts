/**
 * What the call screen needs to draw one moment of a call, wherever it comes from:
 * a live LiveKit room (components/experience/LiveCall.tsx) or the scripted sample
 * (lib/sample.ts). The screen never knows which.
 */

import type { GuardianEvent } from "@/lib/guardian";
import type { AgentPhase } from "@/lib/phase";

export type Line =
  | { kind: "carrier" | "agent"; id: string; at: number; text: string; interim: boolean }
  | { kind: "guardian"; id: string; at: number; event: GuardianEvent };

export type CallFeed = {
  phase: AgentPhase;
  /** 0..1 */
  agentLevel: number;
  /** 0..1 */
  userLevel: number;
  /** Both voices and every desk decision, oldest first. */
  lines: Line[];
  events: GuardianEvent[];
};

export const EMPTY_FEED: CallFeed = {
  phase: "connecting",
  agentLevel: 0,
  userLevel: 0,
  lines: [],
  events: [],
};

/** Merge spoken lines and events into one time-ordered list. */
export function mergeLines(spoken: Line[], events: GuardianEvent[]): Line[] {
  const verdicts: Line[] = events.map((e, i) => ({ kind: "guardian", id: `g-${i}-${e.ts}`, at: e.ts, event: e }));
  return [...spoken, ...verdicts].sort((a, b) => a.at - b.at);
}
