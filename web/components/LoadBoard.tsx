"use client";

import { type Carrier, type Load, lane, loads } from "@/lib/catalog";
import { formatStop, useLang } from "@/lib/i18n";

/**
 * The postings, the way a carrier sees them on a load board: lane, dates, equipment,
 * commodity, weight, miles. No price. "Call for rate" is what real boards say when the
 * broker wants to negotiate on the phone, which is the whole point here.
 */
export function LoadBoard({
  selected,
  carrier,
  onSelect,
}: {
  selected: Load;
  carrier: Carrier;
  onSelect: (l: Load) => void;
}) {
  const { t, l, lang } = useLang();
  return (
    <ul className="grid gap-2">
      {loads.map((load) => {
        const active = load.id === selected.id;
        const fits = carrier.equipment.includes(load.equipment);
        return (
          <li key={load.id}>
            <button
              type="button"
              onClick={() => onSelect(load)}
              aria-pressed={active}
              className={`w-full rounded-lg border p-3 text-left transition ${
                active
                  ? "border-amber-300/70 bg-amber-300/5"
                  : "border-neutral-800 hover:border-neutral-600"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium text-neutral-100">{lane(load)}</span>
                <span className="font-mono text-xs text-neutral-500">{load.id}</span>
              </div>
              <div className="mt-1 grid gap-x-4 gap-y-0.5 font-mono text-[11px] text-neutral-400 sm:grid-cols-2">
                <span>
                  {t("pickup")} · {formatStop(lang, load.origin.date, load.origin.window)}
                </span>
                <span>
                  {t("delivery")} · {formatStop(lang, load.destination.date, load.destination.window)}
                </span>
                <span>
                  {load.equipment} · {load.miles.toLocaleString()} {t("miles")} ·{" "}
                  {load.weight_lbs.toLocaleString()} {t("weight")}
                </span>
                <span className="text-amber-300">
                  {t("rate")} · {t("callForRate")}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">{l(load.commodity)}</p>
              {active && <p className="mt-1 text-xs text-neutral-500">{l(load.notes)}</p>}
              {active && !fits && (
                <p className="mt-1 font-mono text-[11px] text-amber-200/80">{t("equipmentMismatch")}</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
