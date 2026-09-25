"use client";

import { type ReactNode, useRef } from "react";

import { useFinePointer, useReducedMotion } from "@/lib/motion";

/**
 * Pulls its child a little toward the pointer, the way a primary action should feel:
 * it wants to be clicked. Mouse only; nothing moves on touch or with reduced motion.
 */
export function Magnetic({
  children,
  strength = 0.28,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const on = fine && !reduced;

  const move = (e: React.PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!on || !el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate3d(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px, 0)`;
  };
  const leave = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <span
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </span>
  );
}
