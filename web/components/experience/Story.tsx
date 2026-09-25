"use client";

import { useEffect, useRef, useState } from "react";

import { HoloStage } from "@/components/experience/HoloStage";
import { Magnetic } from "@/components/fx/Magnetic";
import { type StringKey, useLang } from "@/lib/i18n";

const CHAPTERS: [StringKey, StringKey][] = [
  ["ch1Title", "ch1Body"],
  ["ch2Title", "ch2Body"],
  ["ch3Title", "ch3Body"],
  ["ch4Title", "ch4Body"],
  ["ch5Title", "ch5Body"],
  ["ch6Title", "ch6Body"],
];

/**
 * "How freight works", told by scrolling: the holographic scene stays pinned while six
 * short chapters pass over it; the chapter crossing the middle of the screen drives the
 * scene. One sentence and one line per chapter, nothing more.
 *
 * Wide screens put the cards on the left and the scene in the space to their right (the
 * card's right edge is measured and handed to the scene); narrower ones put the card
 * under the scene.
 */
export function Story({ onCall, onSample }: { onCall: () => void; onSample: () => void }) {
  const { t } = useLang();
  const [chapter, setChapter] = useState(0);
  const [inset, setInset] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const card = refs.current[0]?.querySelector("article");
    if (!card) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    // ResizeObserver reports once on observe, then on every size change.
    const ro = new ResizeObserver(() => {
      setInset(wide.matches ? Math.round(card.getBoundingClientRect().right) : 0);
    });
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setChapter(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <section id="how" aria-label={t("storyKicker")} className="relative">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <HoloStage chapter={chapter} insetLeft={inset} />
        {/* Soft edges so the scene melts into the page. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[var(--color-void)] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-void)] to-transparent" />
        <nav aria-label={t("storyKicker")} className="absolute left-4 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
          {CHAPTERS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`${i + 1}`}
              aria-current={chapter === i}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                chapter === i ? "scale-125 bg-[var(--color-amber)]" : "bg-white/20 hover:bg-white/50"
              }`}
            />
          ))}
        </nav>
      </div>

      <div className="pointer-events-none relative -mt-[100svh]">
        {CHAPTERS.map(([title, body], i) => (
          <div
            key={title}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="flex min-h-[100svh] items-end justify-center px-4 pb-[8svh] lg:items-center lg:justify-start lg:pb-0 lg:pl-[6vw]"
          >
            <article
              className={`glass pointer-events-auto w-full max-w-md rounded-2xl p-6 transition-all duration-700 lg:max-w-sm lg:p-7 xl:max-w-md ${
                chapter === i ? "opacity-100" : "opacity-40 lg:opacity-30"
              }`}
            >
              <p className="holo-label">
                {i === 0 ? t("storyKicker") : `0${i + 1} / 06`}
              </p>
              <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight tracking-tight text-neutral-50 sm:text-3xl">
                {t(title)}
              </h2>
              <p className="mt-3 text-pretty text-[15px] leading-relaxed text-neutral-400">{t(body)}</p>
              {i === CHAPTERS.length - 1 && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Magnetic>
                    <button
                      type="button"
                      onClick={onCall}
                      className="pulse-ring rounded-full bg-[var(--color-amber)] px-6 py-2.5 font-medium text-neutral-950 transition hover:brightness-110"
                    >
                      {t("heroCta")} →
                    </button>
                  </Magnetic>
                  <button
                    type="button"
                    onClick={onSample}
                    className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-neutral-300 transition hover:border-white/40 hover:text-white"
                  >
                    ▶ {t("heroSample")}
                  </button>
                </div>
              )}
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
