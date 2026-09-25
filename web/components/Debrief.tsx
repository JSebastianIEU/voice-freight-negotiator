"use client";

import { lane } from "@/lib/catalog";
import type { Debrief as DebriefData } from "@/lib/debrief";
import { usd } from "@/lib/guardian";
import { useLang } from "@/lib/i18n";

/** After the call: Alex's private numbers next to what the visitor got. */
export function Debrief({
  data,
  onAgain,
  onChange,
}: {
  data: DebriefData;
  onAgain: () => void;
  onChange: () => void;
}) {
  const { t } = useLang();
  const { load } = data;
  const p = load.prices;

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-300">{t("debriefTitle")}</p>
        <h2 className="mt-2 text-xl font-medium text-neutral-50">{lane(load)}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t("debriefSub")}</p>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label={t("floor")} value={usd.format(p.floor)} />
        <Stat label={t("target")} value={usd.format(p.target)} />
        <Stat label={t("ceiling")} value={usd.format(p.ceiling)} note={t("ceilingNote")} accent />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Stat
          label={data.booked !== null ? t("youGot") : t("alexOffered")}
          value={
            data.booked !== null
              ? usd.format(data.booked)
              : data.highestOffer !== null
                ? usd.format(data.highestOffer)
                : t("noDeal")
          }
          accent={data.booked !== null}
        />
        <Stat
          label={t("marginKept")}
          value={data.marginKept !== null ? usd.format(data.marginKept) : "—"}
        />
        <Stat
          label={t("asksBlocked")}
          value={data.rejectedAsks.length ? data.rejectedAsks.map((a) => usd.format(a)).join(" · ") : t("none")}
        />
        <Stat label={t("filterBlocks")} value={String(data.filterBlocks)} />
      </div>

      <p className="text-center text-sm text-neutral-400">{t("debriefExplain")}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onAgain}
          className="rounded-full bg-amber-300 px-6 py-2.5 font-mono text-sm font-medium text-neutral-950 hover:bg-amber-200"
        >
          {t("callAgain")}
        </button>
        <button
          type="button"
          onClick={onChange}
          className="rounded-full border border-neutral-700 px-6 py-2.5 font-mono text-sm text-neutral-300 hover:border-neutral-500"
        >
          {t("changeSetup")}
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-amber-300/60" : "border-neutral-800"}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">{label}</p>
      <p className={`mt-1 font-mono text-lg ${accent ? "text-amber-200" : "text-neutral-100"}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-neutral-500">{note}</p>}
    </div>
  );
}
