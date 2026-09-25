"use client";

import { useEffect, useState } from "react";

import { Orb } from "@/components/Orb";
import { captionFor } from "@/lib/captions";
import type { GuardianEvent } from "@/lib/guardian";
import { DemoScript } from "@/lib/orb/demo";
import type { AgentPhase } from "@/lib/phase";

const DEMO_WORDS: Record<string, string> = {
  capOffered: "offered",
  capBlocked: "blocked",
  capApproved: "approved",
  capBooked: "booked",
  capVerified: "verified",
  capNotVerified: "not verified",
  capFiltered: "stopped before it was said",
  capLoad: "now discussing",
};

/** Runs DemoScript on a timer and feeds the core exactly like a real call would. */
export function OrbDemo() {
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [levels, setLevels] = useState({ agent: 0, user: 0 });
  const [events, setEvents] = useState<GuardianEvent[]>([]);

  useEffect(() => {
    const script = new DemoScript();
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const frame = script.step(dt);
      setPhase(frame.state);
      setLevels({ agent: frame.agentLevel, user: frame.userLevel });
      if (frame.events.length) setEvents((prev) => [...prev, ...frame.events]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <Orb
        phase={phase}
        agentLevel={levels.agent}
        userLevel={levels.user}
        events={events}
        size={440}
        caption={(ev) => captionFor(ev, (k) => DEMO_WORDS[k] ?? k, (r) => r ?? "")}
      />
      <p className="text-center font-mono text-xs text-neutral-500">
        {phase}
      </p>
    </div>
  );
}
