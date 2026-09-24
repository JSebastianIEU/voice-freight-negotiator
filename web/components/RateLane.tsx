"use client";

import { useEffect, useRef } from "react";

import type { GuardianEvent } from "@/lib/guardian";
import { draw } from "@/lib/lane/draw";
import { LaneModel, type LaneState } from "@/lib/lane/model";

export type RateLaneProps = {
  state: LaneState;
  /** 0..1, the agent's voice level this frame. */
  agentLevel: number;
  /** 0..1, the carrier's (local mic) level this frame. */
  userLevel: number;
  /** Guardian verdicts; only new items are applied (by index). */
  events: GuardianEvent[];
  height?: number;
  className?: string;
};

/**
 * The lane, drawn on a canvas. React owns the props; a single rAF loop owns the
 * pixels. Props are mirrored into refs so the loop never restarts on re-render.
 */
export function RateLane({
  state,
  agentLevel,
  userLevel,
  events,
  height = 260,
  className,
}: RateLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<LaneModel>(new LaneModel());
  const latest = useRef({ state, agentLevel, userLevel });
  const applied = useRef(0);

  latest.current = { state, agentLevel, userLevel };

  // Apply guardian events exactly once each, in order.
  useEffect(() => {
    const model = modelRef.current;
    for (; applied.current < events.length; applied.current++) {
      model.apply(events[applied.current]);
    }
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const model = modelRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      model.resize(width);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // clamp after a hidden tab
      last = now;
      const { state, agentLevel, userLevel } = latest.current;
      model.state = state;
      model.pushLevels(agentLevel, userLevel);
      model.step(dt);
      draw(ctx, model, { width, height });
      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      // One honest frame: markers at rest, no waves.
      model.state = latest.current.state;
      model.settle();
      draw(ctx, model, { width, height });
      return () => ro.disconnect();
    }

    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, [height]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Rate lane, agent ${state}`}
      className={className}
      style={{ width: "100%", height, display: "block" }}
    />
  );
}
