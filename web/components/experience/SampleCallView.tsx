"use client";

import { useEffect, useRef, useState } from "react";

import { CallScreen } from "@/components/experience/CallScreen";
import type { Carrier, Load } from "@/lib/catalog";
import { type CallFeed, EMPTY_FEED } from "@/lib/feed";
import type { GuardianEvent } from "@/lib/guardian";
import { useLang } from "@/lib/i18n";
import { SampleCall } from "@/lib/sample";

/** The scripted call, played on the real call screen. Ends in the same debrief. */
export function SampleCallView({
  carrier,
  load,
  onEnd,
}: {
  carrier: Carrier;
  load: Load;
  onEnd: (events: GuardianEvent[]) => void;
}) {
  const { t } = useLang();
  const [feed, setFeed] = useState<CallFeed>(EMPTY_FEED);
  const call = useRef<SampleCall | null>(null);
  const ended = useRef(false);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  useEffect(() => {
    const c = new SampleCall();
    call.current = c;
    ended.current = false;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setFeed(c.step(dt));
      if (c.done) {
        if (!ended.current) {
          ended.current = true;
          onEndRef.current(c.allEvents);
        }
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const skip = () => {
    const c = call.current;
    if (!c || ended.current) return;
    c.finish();
    ended.current = true;
    onEndRef.current(c.allEvents);
  };

  return (
    <CallScreen
      feed={feed}
      carrier={carrier}
      load={load}
      sample
      controls={
        <button
          type="button"
          onClick={skip}
          className="rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white"
        >
          {t("skipSample")} →
        </button>
      }
    />
  );
}
