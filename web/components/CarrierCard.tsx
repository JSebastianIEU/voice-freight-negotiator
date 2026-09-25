"use client";

import { type Carrier, carriers } from "@/lib/catalog";
import { useLang } from "@/lib/i18n";

/** Pick a persona before the call. */
export function CarrierPicker({ selected, onSelect }: { selected: Carrier; onSelect: (c: Carrier) => void }) {
  const { l } = useLang();
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {carriers.map((c) => {
        const active = c.id === selected.id;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              aria-pressed={active}
              className={`h-full w-full rounded-lg border p-3 text-left transition ${
                active ? "border-amber-300/70 bg-amber-300/5" : "border-neutral-800 hover:border-neutral-600"
              }`}
            >
              <p className="font-medium text-neutral-100">{c.company}</p>
              <p className="font-mono text-[11px] text-neutral-400">
                MC {c.mc} · {c.equipment.join(", ")} · {c.base.city}, {c.base.state}
              </p>
              <p className="mt-1 text-xs text-neutral-400">{l(c.persona)}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The answers Alex will ask for, kept on screen during the call. A real carrier has
 * these on the wall of the cab; the visitor has them here.
 */
export function CarrierCard({ carrier }: { carrier: Carrier }) {
  const { t } = useLang();
  const rows: [string, string][] = [
    [t("mc"), carrier.mc],
    [t("equipment"), carrier.equipment.join(", ")],
    [t("base"), `${carrier.base.city}, ${carrier.base.state} · ${t("tomorrowMorning")}`],
    [t("driver"), `${carrier.driver} · ${carrier.phone}`],
  ];
  return (
    <section aria-label={t("yourCard")} className="rounded-lg border border-neutral-800 p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">{t("yourCard")}</p>
        <p className="font-medium text-neutral-100">{carrier.company}</p>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="text-neutral-200">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
