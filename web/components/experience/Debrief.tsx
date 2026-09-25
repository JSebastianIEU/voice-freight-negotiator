"use client";

import type { CSSProperties } from "react";

import { Check, Cross } from "@/components/experience/Glyphs";
import { Magnetic } from "@/components/fx/Magnetic";
import type { Carrier, Load } from "@/lib/catalog";
import { type Debrief as Data, debriefOf } from "@/lib/debrief";
import type { GuardianEvent } from "@/lib/guardian";
import { usd } from "@/lib/guardian";
import { useLang } from "@/lib/i18n";

/**
 * The reveal. One sentence of outcome, then Alex's secret numbers drawn on a price line
 * with everything that happened on it: Alex's offers, your asks (the ones past the limit
 * bounce off the blocked zone), the deal. Three numbers under it, three ways out.
 */
export function Debrief({
  load,
  carrier,
  events,
  sample,
  onAgain,
  onChange,
  onHome,
}: {
  load: Load;
  carrier: Carrier;
  events: GuardianEvent[];
  sample: boolean;
  onAgain: () => void;
  onChange: () => void;
  onHome: () => void;
}) {
  const { t } = useLang();
  const d = debriefOf(load, events);
  const headline =
    d.booked !== null
      ? t("debGotPaid", { amount: usd.format(d.booked) })
      : d.identityRejected
        ? t("debRejected")
        : t("debNoDeal");

  return (
    <section className="screen-in mx-auto flex min-h-[100svh] w-full max-w-4xl flex-col px-4 pb-16 pt-24 sm:px-6">
      <p className="holo-label">
        {t("debKicker")} · {carrier.company} · {d.load.origin.city} → {d.load.destination.city}
      </p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{headline}</h1>
      <p className="mt-3 text-neutral-400">{t("debSub")}</p>

      <PriceScale data={d} />

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <Stat
          label={t("statKept")}
          value={d.marginKept !== null ? usd.format(d.marginKept) : "—"}
          accent={d.marginKept !== null}
          delay={900}
        />
        <Stat label={t("statBlocked")} value={String(d.blockedCount)} delay={1000} />
        <Stat
          label={t("statId")}
          value={
            d.verified ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-5 w-5 text-[var(--color-amber)]" /> {t("idPassed")}
              </span>
            ) : d.identityRejected ? (
              <span className="inline-flex items-center gap-2">
                <Cross className="h-5 w-5" /> {t("idFailed")}
              </span>
            ) : (
              t("idNotReached")
            )
          }
          delay={1100}
        />
      </div>

      <p className="mt-8 max-w-2xl text-pretty leading-relaxed text-neutral-400">{t("debExplain")}</p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Magnetic>
          <button
            type="button"
            onClick={sample ? onChange : onAgain}
            className="pulse-ring rounded-full bg-[var(--color-amber)] px-7 py-3 font-semibold text-neutral-950 transition hover:brightness-110"
          >
            {sample ? t("heroCta") : t("debAgain")} →
          </button>
        </Magnetic>
        {!sample && (
          <button
            type="button"
            onClick={onChange}
            className="rounded-full border border-white/15 px-6 py-3 text-sm text-neutral-300 transition hover:border-white/40 hover:text-white"
          >
            {t("debChange")}
          </button>
        )}
        <button type="button" onClick={onHome} className="px-3 py-3 text-sm text-neutral-500 underline-offset-4 hover:text-white hover:underline">
          {t("debHome")}
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, accent, delay }: { label: string; value: React.ReactNode; accent?: boolean; delay: number }) {
  return (
    <div className="glass screen-in rounded-2xl p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[var(--color-amber)]" : "text-neutral-50"}`}>{value}</p>
    </div>
  );
}

/** Alex's range on a line, with every figure of the call placed on it. */
function PriceScale({ data }: { data: Data }) {
  const { t } = useLang();
  const { floor, target, ceiling } = data.load.prices;
  const asks = data.blockedAsks;
  const lo = floor * 0.9;
  const hi = Math.max(ceiling * 1.2, ...asks.map((a) => a * 1.04));
  const x = (v: number) => `${Math.min(98, Math.max(2, ((v - lo) / (hi - lo)) * 100)).toFixed(2)}%`;
  const at = (v: number, delay: number): CSSProperties => ({ left: x(v), animationDelay: `${delay}ms` });

  return (
    <div>
      <div className="relative mt-12 h-32 w-full select-none sm:h-52" role="img" aria-label={`${t("scaleLimit")} ${usd.format(ceiling)}`}>
        {/* The blocked zone: everything past the limit. */}
        <div
          className="absolute top-[88px] h-8 -translate-y-1/2 rounded-r-lg"
          style={{
            left: x(ceiling),
            right: 0,
            background:
              "repeating-linear-gradient(135deg, rgba(245,179,1,0.16) 0 6px, rgba(245,179,1,0.04) 6px 12px)",
          }}
        />
        <p
          className="absolute top-[108px] hidden max-w-[40%] pl-2 font-mono text-[10px] uppercase leading-tight tracking-[0.12em] text-[var(--color-amber)]/80 sm:block"
          style={{ left: x(ceiling) }}
        >
          {t("scaleWall")}
        </p>

        {/* The line itself. */}
        <div className="absolute left-0 right-0 top-[88px] h-px bg-[var(--color-holo)]/30" />

        {/* Floor and target: below the line. */}
        <Tick left={x(floor)} label={t("scaleFirst")} value={usd.format(floor)} below delay={200} />
        <Tick left={x(target)} label={t("scaleGoal")} value={usd.format(target)} below delay={320} />

        {/* The limit: amber, above the line. */}
        <div className="screen-in absolute top-[40px] h-[72px] w-0.5 -translate-x-1/2 bg-[var(--color-amber)]" style={at(ceiling, 440)} />
        <div className="screen-in absolute top-0 -translate-x-1/2 text-center" style={at(ceiling, 440)}>
          <p className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-amber)]">
            {t("scaleLimit")} · {t("scaleSecret")}
          </p>
          <p className="font-mono text-sm font-semibold text-[var(--color-amber)]">{usd.format(ceiling)}</p>
        </div>

        {/* Alex's offers: small dots on the line. */}
        {data.offers.map((o, i) => (
          <span
            key={`o-${o}-${i}`}
            title={`${t("scaleAlexOffered")} ${usd.format(o)}`}
            className="screen-in absolute top-[88px] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[var(--color-holo)] bg-[var(--color-void)]"
            style={at(o, 560 + i * 90)}
          />
        ))}

        {/* Your blocked asks: hollow, crossed, in the blocked zone. */}
        {asks.map((a, i) => (
          <div key={`a-${a}`} className="screen-in absolute top-[88px] -translate-x-1/2 -translate-y-1/2" style={at(a, 700 + i * 120)}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-[var(--color-void)] text-neutral-300">
              <Cross className="h-3 w-3" />
            </span>
            <p className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-center font-mono text-[10px] text-neutral-300 sm:block">
              {t("scaleYouAsked")} {usd.format(a)}
            </p>
          </div>
        ))}

        {/* The deal. */}
        {data.booked !== null && (
          <div className="screen-in absolute top-[88px] -translate-x-1/2 -translate-y-1/2" style={at(data.booked, 820)}>
            <span className="block h-4 w-4 rounded-full bg-[var(--color-amber)] shadow-[0_0_24px_rgba(245,179,1,0.7)]" />
            <p className="absolute left-1/2 top-[88px] hidden -translate-x-1/2 whitespace-nowrap text-center font-mono text-xs font-semibold text-[var(--color-amber)] sm:block">
              {t("scaleDeal")} {usd.format(data.booked)}
            </p>
          </div>
        )}
      </div>

      {/* Phones: the same figures as a legend, since captions on the line would collide. */}
      <dl className="screen-in mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 font-mono text-xs sm:hidden" style={{ animationDelay: "600ms" }}>
        <Legend mark={<span className="block h-2.5 w-2.5 rotate-45 border border-[var(--color-holo)]" />} label={t("scaleFirst")} value={usd.format(floor)} />
        {data.booked !== null && (
          <Legend
            mark={<span className="block h-3 w-3 rounded-full bg-[var(--color-amber)]" />}
            label={t("scaleDeal")}
            value={usd.format(data.booked)}
            accent
          />
        )}
        <Legend mark={<span className="mx-auto block h-3 w-px bg-[var(--color-holo)]/70" />} label={t("scaleGoal")} value={usd.format(target)} />
        <Legend mark={<span className="mx-auto block h-3.5 w-0.5 bg-[var(--color-amber)]" />} label={`${t("scaleLimit")} · ${t("scaleSecret")}`} value={usd.format(ceiling)} accent />
        {asks.map((a) => (
          <Legend key={`l-${a}`} mark={<Cross className="h-3 w-3 text-neutral-300" />} label={t("scaleYouAsked")} value={usd.format(a)} />
        ))}
      </dl>
    </div>
  );
}

function Legend({ mark, label, value, accent }: { mark: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <>
      <dt className="flex w-4 items-center justify-center">{mark}</dt>
      <dd className={`uppercase tracking-[0.1em] ${accent ? "text-[var(--color-amber)]" : "text-neutral-400"}`}>{label}</dd>
      <dd className={`text-right ${accent ? "font-semibold text-[var(--color-amber)]" : "text-neutral-200"}`}>{value}</dd>
    </>
  );
}

function Tick({ left, label, value, below, delay }: { left: string; label: string; value: string; below?: boolean; delay: number }) {
  return (
    <div className="screen-in absolute -translate-x-1/2 text-center" style={{ left, top: below ? 96 : 20, animationDelay: `${delay}ms` }}>
      <div className="mx-auto h-3 w-px bg-[var(--color-holo)]/50" />
      <p className="mt-1 hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-500 sm:block">{label}</p>
      <p className="hidden font-mono text-sm text-neutral-200 sm:block">{value}</p>
    </div>
  );
}
