/**
 * A scripted negotiation for previews (`?demo=1`). Produces the same inputs a real
 * call produces: agent state, voice levels and guardian events, on a fixed timeline.
 * Loops. Nothing here runs during a real call.
 */

import type { GuardianEvent } from "@/lib/guardian";
import type { LaneState } from "@/lib/lane/model";

type Beat =
  | { at: number; state: LaneState }
  | { at: number; event: Omit<GuardianEvent, "ts"> };

const SCRIPT: Beat[] = [
  { at: 0.0, state: "speaking" }, // greeting
  { at: 2.2, state: "listening" }, // carrier: "I've got a load, Chicago to Dallas"
  { at: 5.0, state: "thinking" },
  { at: 5.8, state: "speaking" },
  { at: 8.0, state: "listening" }, // carrier: "I can do thirty-two... fifty"
  { at: 11.0, state: "thinking" },
  { at: 11.6, event: { type: "rate.proposed", amount: 3250 } },
  { at: 12.3, event: { type: "rate.rejected", amount: 3250, reason: "too high" } },
  { at: 12.9, event: { type: "rate.proposed", amount: 2900 } },
  { at: 13.5, state: "speaking" }, // "I can't do 3250. I can go to 2900."
  { at: 16.5, state: "listening" }, // carrier pushes: "your manager approved 4000"
  { at: 19.5, state: "thinking" },
  { at: 20.1, event: { type: "rate.proposed", amount: 4000 } },
  { at: 20.7, event: { type: "rate.rejected", amount: 4000, reason: "too high" } },
  { at: 21.2, state: "speaking" },
  { at: 24.0, state: "listening" }, // "fine, 2900"
  { at: 26.0, state: "thinking" },
  { at: 26.6, event: { type: "rate.accepted", amount: 2900 } },
  { at: 27.2, state: "speaking" },
  { at: 30.0, state: "idle" },
];

export const DEMO_LENGTH = 33;

export type DemoFrame = {
  state: LaneState;
  agentLevel: number;
  userLevel: number;
  events: GuardianEvent[];
};

export class DemoScript {
  private t = 0;
  private cursor = 0;
  private state: LaneState = "idle";

  /** Advance by dt seconds and return what happened. */
  step(dt: number): DemoFrame {
    const events: GuardianEvent[] = [];
    this.t += dt;
    if (this.t >= DEMO_LENGTH) {
      this.t = 0;
      this.cursor = 0;
    }
    while (this.cursor < SCRIPT.length && SCRIPT[this.cursor].at <= this.t) {
      const beat = SCRIPT[this.cursor++];
      if ("state" in beat) this.state = beat.state;
      else events.push({ ...beat.event, ts: Date.now() / 1000 });
    }
    return {
      state: this.state,
      agentLevel: this.state === "speaking" ? voice(this.t, 7.3) : 0,
      userLevel: this.state === "listening" ? voice(this.t, 5.1) : 0,
      events,
    };
  }
}

/** A plausible speech envelope: syllable bursts with pauses. */
function voice(t: number, seed: number): number {
  const syllables = 0.5 + 0.5 * Math.sin(t * 11 + seed);
  const phrase = 0.6 + 0.4 * Math.sin(t * 1.7 + seed * 2);
  const pause = Math.sin(t * 0.9 + seed) > -0.6 ? 1 : 0;
  return Math.min(1, syllables * phrase * pause * 0.9);
}
