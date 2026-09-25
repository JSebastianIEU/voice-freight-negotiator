"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * Fades its content in the first time it scrolls into view. The hidden state lives in CSS
 * ([data-reveal]) and reduced motion shows everything at once.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.shown = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-reveal="" style={{ transitionDelay: `${delay}ms` }} className={className}>
      {children}
    </div>
  );
}
