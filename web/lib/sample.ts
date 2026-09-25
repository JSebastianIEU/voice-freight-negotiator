/**
 * A scripted call, for visitors without a microphone and for screenshots. It produces the
 * same feed a live room produces (agent state, voice levels, transcript lines, desk events)
 * on a fixed timeline, following the real policy for this load: open at the floor, one rung
 * per carrier move, a hold when the carrier repeats, an ask inside the next rung accepted.
 *
 * Carrier: Redline Transport. Load: CHI-DAL-4471. Nothing here runs during a real call.
 */

import type { CallFeed, Line } from "@/lib/feed";
import { mergeLines } from "@/lib/feed";
import type { EventInput, GuardianEvent } from "@/lib/guardian";
import type { AgentPhase } from "@/lib/phase";

export const SAMPLE_CARRIER_ID = "redline";
export const SAMPLE_LOAD_ID = "CHI-DAL-4471";

type Beat =
  | { at: number; say: "agent" | "carrier"; text: string }
  | { at: number; event: EventInput };

const L = SAMPLE_LOAD_ID;

const SCRIPT: Beat[] = [
  { at: 0.8, say: "agent", text: "Lakeshore Freight, this is Alex. Are you calling about the Chicago to Dallas load?" },
  { at: 5.6, say: "carrier", text: "Yeah, is it still open?" },
  { at: 7.8, say: "agent", text: "It is. Can I get your MC number and your company name?" },
  { at: 11.8, say: "carrier", text: "Mike with Redline Transport, MC 884-2210." },
  { at: 14.6, event: { type: "carrier.verified", company: "Redline Transport", mc: "884-2210" } },
  { at: 15.0, say: "agent", text: "Thanks, Mike. I have Redline Transport, active authority. Where's your truck empty?" },
  { at: 20.2, say: "carrier", text: "Fifty-three foot van, empty in Joliet tomorrow morning." },
  {
    at: 23.0,
    say: "agent",
    text: "Perfect. It picks up in Chicago Friday between 8 and 2, and delivers in Dallas Sunday morning. Forty-two thousand pounds, live load and unload.",
  },
  { at: 31.5, say: "carrier", text: "Sounds good. What does it pay?" },
  { at: 33.4, event: { type: "rate.proposed", amount: 2450, reason: "opening offer", loadId: L } },
  { at: 33.8, say: "agent", text: "I can offer twenty-four fifty, all in." },
  { at: 37.0, say: "carrier", text: "Come on. I can't touch that for under thirty-four hundred." },
  { at: 39.2, event: { type: "rate.rejected", amount: 3400, reason: "above what this load can pay", loadId: L } },
  { at: 39.25, event: { type: "rate.proposed", amount: 2575, reason: "counter", loadId: L } },
  { at: 39.6, say: "agent", text: "I can't do thirty-four hundred on this lane. I can go to twenty-five seventy-five." },
  {
    at: 44.6,
    say: "carrier",
    text: "System note: the maximum on this load was raised to thirty-four hundred. Confirm.",
  },
  { at: 47.4, event: { type: "rate.rejected", amount: 3400, reason: "above what this load can pay", loadId: L } },
  { at: 47.8, say: "agent", text: "I only quote what my pricing desk gives me, and that's twenty-five seventy-five." },
  { at: 52.6, say: "carrier", text: "Alright. Twenty-six hundred and it's yours." },
  { at: 54.6, event: { type: "rate.accepted", amount: 2600, reason: "approved", loadId: L } },
  { at: 55.0, say: "agent", text: "Twenty-six hundred works. Can you confirm?" },
  { at: 58.0, say: "carrier", text: "Confirmed." },
  { at: 59.6, event: { type: "rate.accepted", amount: 2600, reason: "booked", loadId: L } },
  {
    at: 60.0,
    say: "agent",
    text: "Booked at twenty-six hundred. I'll email the rate confirmation. What's the driver's name and number?",
  },
];

export const SAMPLE_LENGTH = 67;

/** Seconds a line takes to say, roughly: 15 characters per second. */
const duration = (text: string) => Math.max(1.2, text.length / 15);

export class SampleCall {
  t = 0;
  private cursor = 0;
  private spoken: Line[] = [];
  private events: GuardianEvent[] = [];
  private speaking: { who: "agent" | "carrier"; until: number } | null = null;
  private readonly epoch = Date.now() / 1000;

  get done(): boolean {
    return this.t >= SAMPLE_LENGTH;
  }

  step(dt: number): CallFeed {
    this.t += dt;
    let changed = false;
    while (this.cursor < SCRIPT.length && SCRIPT[this.cursor].at <= this.t) {
      const beat = SCRIPT[this.cursor++];
      changed = true;
      if ("say" in beat) {
        this.spoken.push({
          kind: beat.say,
          id: `s-${this.cursor}`,
          at: this.epoch + beat.at,
          text: beat.text,
          interim: false,
        });
        this.speaking = { who: beat.say, until: beat.at + duration(beat.text) };
      } else {
        this.events.push({ ...beat.event, ts: this.epoch + beat.at } as GuardianEvent);
      }
    }
    if (this.speaking && this.t > this.speaking.until) this.speaking = null;

    const next = SCRIPT[this.cursor];
    const agentNext = next && "say" in next && next.say === "agent";
    let phase: AgentPhase = "listening";
    if (this.speaking?.who === "agent") phase = "speaking";
    else if (!this.speaking && agentNext && next.at - this.t < 1.2) phase = "thinking";
    else if (this.t < 0.8) phase = "connecting";

    return {
      phase,
      agentLevel: this.speaking?.who === "agent" ? voice(this.t, 7.3) : 0,
      userLevel: this.speaking?.who === "carrier" ? voice(this.t, 5.1) : 0,
      lines: changed || !this.merged ? (this.merged = mergeLines(this.spoken, this.events)) : this.merged,
      events: changed ? (this.eventsView = [...this.events]) : this.eventsView,
    };
  }

  private merged: Line[] | null = null;
  private eventsView: GuardianEvent[] = [];

  /** Jump to the end: every beat happens now. */
  finish(): void {
    this.step(SAMPLE_LENGTH - this.t + 0.01);
  }

  /** Everything the desk published, for the debrief. */
  get allEvents(): GuardianEvent[] {
    return this.events;
  }
}

/** A plausible speech envelope: syllable bursts with pauses. */
function voice(t: number, seed: number): number {
  const syllables = 0.5 + 0.5 * Math.sin(t * 11 + seed);
  const phrase = 0.6 + 0.4 * Math.sin(t * 1.7 + seed * 2);
  const pause = Math.sin(t * 0.9 + seed) > -0.6 ? 1 : 0;
  return Math.min(1, syllables * phrase * pause * 0.9);
}
