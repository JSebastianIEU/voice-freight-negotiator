"use client";

import { useDataChannel } from "@livekit/components-react";
import { useCallback, useState } from "react";

import { GUARDIAN_TOPIC, parseGuardianEvent, type GuardianEvent } from "@/lib/guardian";

/**
 * Every guardian verdict received on this call, oldest first.
 *
 * The worker publishes one small JSON message per decision on the `guardian`
 * data-channel topic (reliable, ordered, separate from the audio path). Must be
 * used inside a LiveKitRoom. Malformed payloads are dropped by the parser.
 */
export function useGuardianEvents(): GuardianEvent[] {
  const [events, setEvents] = useState<GuardianEvent[]>([]);
  const onMessage = useCallback((msg: { payload: Uint8Array }) => {
    const ev = parseGuardianEvent(msg.payload);
    if (ev) setEvents((prev) => [...prev, ev]);
  }, []);
  useDataChannel(GUARDIAN_TOPIC, onMessage);
  return events;
}
