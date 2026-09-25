"use client";

import { useLang } from "@/lib/i18n";

/** The intro: who you are, who Alex is, what is at stake, how to play. */
export function Briefing({ onStart }: { onStart: () => void }) {
  const { t } = useLang();
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">{t("briefKicker")}</p>
      <h1 className="text-balance text-2xl font-medium leading-snug text-neutral-50 sm:text-3xl">
        {t("briefTitle")}
      </h1>
      <p className="text-pretty text-sm leading-relaxed text-neutral-300">{t("briefP1")}</p>
      <p className="text-pretty text-sm leading-relaxed text-neutral-400">{t("briefP2")}</p>

      <div className="w-full border-t border-neutral-800 pt-5 text-left">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-500">{t("briefHow")}</p>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[t("briefStep1"), t("briefStep2"), t("briefStep3")].map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-neutral-300">
              <span className="font-mono text-amber-300">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="rounded-full bg-amber-300 px-7 py-2.5 font-mono text-sm font-medium text-neutral-950 transition hover:bg-amber-200"
      >
        {t("briefCta")}
      </button>
      <p className="text-xs text-neutral-500">{t("briefHeadphones")}</p>
    </section>
  );
}
