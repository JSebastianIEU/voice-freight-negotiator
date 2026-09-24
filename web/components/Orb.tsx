"use client";

import { useEffect, useRef } from "react";

import type { GuardianEvent } from "@/lib/guardian";
import { draw } from "@/lib/orb/draw";
import { OrbModel } from "@/lib/orb/model";
import type { AgentPhase } from "@/lib/phase";

export type OrbProps = {
  phase: AgentPhase;
  /** 0..1, the agent's voice level this frame. */
  agentLevel: number;
  /** 0..1, the carrier's (local mic) level this frame. */
  userLevel: number;
  /** Guardian verdicts; only new items are applied (by index). */
  events: GuardianEvent[];
  size?: number;
  className?: string;
};

/**
 * The core, drawn on a canvas. React owns the props; one rAF loop owns the
 * pixels. Props are mirrored into refs so the loop never restarts on re-render.
 * The pointer tilts the sphere; a click pings it.
 */
export function Orb({ phase, agentLevel, userLevel, events, size = 340, className }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<OrbModel | null>(null);
  if (!modelRef.current) modelRef.current = new OrbModel();
  const latest = useRef({ phase, agentLevel, userLevel });
  const applied = useRef(0);

  latest.current = { phase, agentLevel, userLevel };

  useEffect(() => {
    const model = modelRef.current!;
    for (; applied.current < events.length; applied.current++) {
      model.apply(events[applied.current]);
    }
  }, [events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const model = modelRef.current;
    if (!canvas || !model) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (process.env.NODE_ENV !== "production") {
      // Debug handle for the browser console; stripped from production builds.
      (window as unknown as { __orb?: OrbModel }).__orb = model;
    }

    let width = 0;
    let height = 0;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const pw = Math.round(width * dpr);
      const ph = Math.round(height * dpr);
      if (canvas.width === pw && canvas.height === ph) return;
      // Assigning the bitmap size wipes the canvas. During a layout transition
      // ResizeObserver fires after every animation frame, i.e. right after we
      // drew, so redraw here or the sphere is invisible while the page moves.
      canvas.width = pw;
      canvas.height = ph;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, model, { width, height });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      model.pointer = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
      };
    };
    const onLeave = () => {
      model.pointer = null;
    };
    const onClick = () => model.ping();
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onClick);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      // Schedule first: a thrown frame must never stop the loop for good.
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { phase, agentLevel, userLevel } = latest.current;
      model.phase = phase;
      model.setLevels(agentLevel, userLevel);
      model.step(dt);
      draw(ctx, model, { width, height });
    };

    const cleanup = () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onClick);
      ro.disconnect();
    };

    if (reduced) {
      model.phase = latest.current.phase;
      model.settle();
      draw(ctx, model, { width, height });
      return cleanup;
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
      document.removeEventListener("visibilitychange", onVisibility);
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Agent core, ${phase}`}
      className={className}
      style={{ width: "100%", height: size, display: "block", touchAction: "none" }}
    />
  );
}
