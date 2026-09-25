"use client";

import { type ReactNode, useRef } from "react";

import { useFinePointer, useReducedMotion } from "@/lib/motion";

/**
 * A card that leans toward the pointer and catches a glare where the pointer is. The
 * transform is written straight to the element (no React state), so hovering a grid of
 * cards never re-renders them. No effect on touch screens or with reduced motion.
 */
export function Tilt({
  children,
  className = "",
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  /** Degrees at the edges. */
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const on = fine && !reduced;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!on || !el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${(
      (px - 0.5) *
      max
    ).toFixed(2)}deg) translateZ(0)`;
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`}>
      {children}
      {on && <span aria-hidden className="tilt-glare" />}
    </div>
  );
}
