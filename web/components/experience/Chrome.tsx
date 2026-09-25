"use client";

import { useEffect, useState } from "react";

import { useLang } from "@/lib/i18n";

const REPO = "https://github.com/JSebastianIEU/voice-freight-negotiator";
const REPORT = `${REPO}/blob/main/docs/attacks/results-20260924-205831-guardian.md`;

/** Fixed header: brand (home), how it works, code, language. Turns to glass on scroll. */
export function Header({ onHome, showHow }: { onHome: () => void; showHow: boolean }) {
  const { t, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-white/5 bg-[var(--color-void)]/70 backdrop-blur-md" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button type="button" onClick={onHome} className="group flex items-center gap-2.5">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-[var(--color-amber)]/40 motion-reduce:hidden" />
            <span className="h-2 w-2 rounded-full bg-[var(--color-amber)]" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-300 transition group-hover:text-white sm:text-xs sm:tracking-[0.2em]">
            {t("brand")}
          </span>
        </button>
        <nav className="flex shrink-0 items-center gap-3 sm:gap-6">
          {showHow && (
            <a href="#how" className="hidden text-sm text-neutral-400 transition hover:text-white sm:inline">
              {t("navHow")}
            </a>
          )}
          <a href={REPO} target="_blank" rel="noreferrer" className="text-sm text-neutral-400 transition hover:text-white">
            {t("navCode")} ↗
          </a>
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "es" : "en")}
            aria-label={t("langToggleLabel")}
            className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-neutral-200 transition hover:border-white/40"
          >
            {t("langToggle")}
          </button>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-14 pt-24 sm:px-6">
      <div className="glass flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-pretty text-neutral-300">{t("footStress")}</p>
        <a href={REPORT} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-amber)] hover:underline">
          {t("footReport")} ↗
        </a>
      </div>
      <div className="mt-8 flex flex-col gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-600 sm:flex-row sm:justify-between">
        <span>LiveKit Agents · GPT-4.1 mini · Deepgram · Cartesia · Next.js · Cloud Run</span>
        <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-neutral-300">
          {t("footBy")} ↗
        </a>
      </div>
    </footer>
  );
}
