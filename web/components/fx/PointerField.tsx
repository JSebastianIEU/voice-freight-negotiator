"use client";

import { useEffect, useRef } from "react";

import { useFinePointer, useReducedMotion } from "@/lib/motion";

const INTERACTIVE = "a,button,[role=button],[data-cursor],input,label,select,summary";

/**
 * The page's light: a holographic grid behind everything, a soft spotlight that follows
 * the pointer across it, and a ring that trails the cursor and opens over anything
 * clickable. CSS variables (--mx, --my) carry the pointer to the stylesheet, so the
 * spotlight costs one style recalculation per frame and no React renders.
 *
 * The loop only runs while the pointer moves or the ring is catching up. Touch screens
 * and reduced motion get the grid alone.
 */
export function PointerField() {
  const ring = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const live = fine && !reduced;

  useEffect(() => {
    if (!live) return;
    const root = document.documentElement;
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.3;
    let rx = x;
    let ry = y;
    let raf = 0;
    let running = false;

    const frame = () => {
      root.style.setProperty("--mx", `${x}px`);
      root.style.setProperty("--my", `${y}px`);
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      const el = ring.current;
      if (el) el.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
      if (Math.abs(x - rx) + Math.abs(y - ry) > 0.3) {
        raf = requestAnimationFrame(frame);
      } else {
        running = false;
      }
    };
    const kick = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      x = e.clientX;
      y = e.clientY;
      const target = e.target as Element | null;
      const el = ring.current;
      if (el) {
        el.dataset.hover = String(Boolean(target?.closest?.(INTERACTIVE)));
        el.dataset.hidden = "false";
      }
      kick();
    };
    const onDown = () => ring.current?.setAttribute("data-down", "true");
    const onUp = () => ring.current?.setAttribute("data-down", "false");
    const onLeave = () => ring.current?.setAttribute("data-hidden", "true");

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [live]);

  return (
    <>
      <div aria-hidden className="holo-grid" />
      {live && <div aria-hidden className="holo-spot" />}
      {live && <div ref={ring} aria-hidden className="cursor-ring" data-hidden="true" />}
    </>
  );
}
