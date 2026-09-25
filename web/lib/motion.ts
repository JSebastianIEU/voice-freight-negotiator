"use client";

import { useSyncExternalStore } from "react";

/** A media query as React state, safe on the server (false until hydrated). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The visitor asked the OS for less motion: no parallax, no tilt, settled canvases. */
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** A mouse or trackpad: hover effects make sense. Touch screens get none of them. */
export const useFinePointer = () => useMediaQuery("(hover: hover) and (pointer: fine)");
