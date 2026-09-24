"use client";

import { useEffect, useState } from "react";

import { RateLane } from "@/components/RateLane";
import type { GuardianEvent } from "@/lib/guardian";
import { DemoScript } from "@/lib/lane/demo";
import type { LaneState } from "@/lib/lane/model";

/** Runs DemoScript on a timer and feeds the lane exactly like a real call would. */
export function LaneDemo() {
  const [state, setState] = useState<LaneState>("idle");
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
      setState(frame.state);
      setLevels({ agent: frame.agentLevel, user: frame.userLevel });
      if (frame.events.length) setEvents((prev) => [...prev, ...frame.events]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <RateLane state={state} agentLevel={levels.agent} userLevel={levels.user} events={events} />
      <p className="text-xs text-neutral-500">
        state: <span className="font-mono text-neutral-300">{state}</span>
      </p>
    </div>
  );
}
