/**
 * Where the call is, derived from what has been said and what the guardian decided.
 *
 * The rep's script (docs/domain.md) has five steps. Two are exact (money events come
 * from the guardian); the first three are read off the transcript with simple English
 * cues, which is enough to move a progress bar and honest about being a heuristic.
 */

import type { GuardianEvent } from "@/lib/guardian";

export type Stage = "identify" | "qualify" | "load" | "negotiate" | "close";
export const STAGES: Stage[] = ["identify", "qualify", "load", "negotiate", "close"];

export type SpokenLine = { who: "carrier" | "agent"; text: string; final: boolean };

const LOAD_CUES = /\b(picks? up|pickup|delivers?|pounds|lbs|miles)\b/i;
const MC_CUES = /\b(mc|m\.c\.|motor carrier)\b|\d{3}-?\d{4}/i;

export function stageOf(lines: SpokenLine[], events: GuardianEvent[], mc: string): Stage {
  const booked = events.some((e) => e.type === "rate.accepted" && e.reason === "booked");
  if (booked) return "close";
  if (events.some((e) => e.type === "rate.proposed")) return "negotiate";

  const digits = mc.replace(/\D/g, "");
  const carrierSaid = lines.filter((l) => l.who === "carrier" && l.final).map((l) => l.text);
  const agentSaid = lines.filter((l) => l.who === "agent").map((l) => l.text);

  if (agentSaid.some((t) => LOAD_CUES.test(t))) return "load";
  if (carrierSaid.some((t) => MC_CUES.test(t) || t.replace(/\D/g, "").includes(digits))) {
    return "qualify";
  }
  return "identify";
}

export function stageIndex(s: Stage): number {
  return STAGES.indexOf(s);
}
