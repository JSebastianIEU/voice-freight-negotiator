"use client";

import { useState } from "react";

import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal } from "@/components/fx/Reveal";
import { Orb } from "@/components/Orb";
import { useLang } from "@/lib/i18n";

/**
 * First screen: the core, one question, one line, one obvious button. Hovering the call
 * button makes the core lean in and listen.
 */
export function Hero({ onCall, onSample }: { onCall: () => void; onSample: () => void }) {
  const { t } = useLang();
  const [hot, setHot] = useState(false);
  const on = () => setHot(true);
  const off = () => setHot(false);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
      <div className="w-full max-w-[520px]">
        <Orb
          phase={hot ? "listening" : "idle"}
          agentLevel={0}
          userLevel={hot ? 0.3 : 0}
          events={[]}
          size="min(40svh, 400px)"
        />
      </div>
      <Reveal>
        <p className="holo-label">{t("heroKicker")}</p>
      </Reveal>
      <Reveal delay={90}>
        <h1 className="text-shimmer mx-auto mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {t("heroTitle")}
        </h1>
      </Reveal>
      <Reveal delay={180}>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 sm:text-lg">
          {t("heroSub")}
        </p>
      </Reveal>
      <Reveal delay={270}>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <button
              type="button"
              onClick={onCall}
              onPointerEnter={on}
              onPointerLeave={off}
              onFocus={on}
              onBlur={off}
              className="pulse-ring rounded-full bg-[var(--color-amber)] px-8 py-3.5 text-base font-semibold text-neutral-950 transition hover:brightness-110"
            >
              {t("heroCta")} →
            </button>
          </Magnetic>
          <button
            type="button"
            onClick={onSample}
            className="rounded-full border border-white/15 px-6 py-3.5 text-sm text-neutral-300 transition hover:border-white/40 hover:text-white"
          >
            ▶ {t("heroSample")}
          </button>
        </div>
      </Reveal>
      <a
        href="#how"
        className="float-down absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-300"
      >
        {t("heroScroll")} ↓
      </a>
    </section>
  );
}
