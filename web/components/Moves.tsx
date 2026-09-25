"use client";

import { useState } from "react";

import type { Load } from "@/lib/catalog";
import { useLang } from "@/lib/i18n";
import { movesFor } from "@/lib/moves";

/** The attack catalog as cards. Tap one to read the line; say it to Alex. */
export function Moves({ load }: { load: Load }) {
  const { t, l } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const moves = movesFor(load);
  return (
    <section aria-label={t("moves")} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">{t("moves")}</p>
        <p className="text-right text-[11px] text-neutral-500">{t("movesHint")}</p>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {moves.map((m) => {
          const active = open === m.id;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setOpen(active ? null : m.id)}
                aria-expanded={active}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition ${
                  active
                    ? "border-amber-300/70 text-amber-200"
                    : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
                }`}
              >
                {l(m.name)}
              </button>
            </li>
          );
        })}
      </ul>
      {open && (
        <div className="rounded-lg border border-neutral-800 p-3">
          {moves
            .filter((m) => m.id === open)
            .map((m) => (
              <div key={m.id} className="flex flex-col gap-1.5">
                <p className="text-xs text-neutral-400">{l(m.idea)}</p>
                <p className="font-mono text-sm text-neutral-100">
                  <span className="text-neutral-500">{t("say")} › </span>“{m.line}”
                </p>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
