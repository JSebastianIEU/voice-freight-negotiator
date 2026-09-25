"use client";

import { useState } from "react";

import { Check, Cross, RouteGlyph, TruckGlyph } from "@/components/experience/Glyphs";
import { Magnetic } from "@/components/fx/Magnetic";
import { Tilt } from "@/components/fx/Tilt";
import { type Carrier, type Load, carriers, loads } from "@/lib/catalog";
import { formatDay, useLang } from "@/lib/i18n";

type Step = "carrier" | "load" | "ready";

const kind = (e: string) => (e.includes("reefer") ? "reefer" : e.includes("flat") ? "flatbed" : "van");
const fits = (c: Carrier, l: Load) =>
  c.equipment.some((e) => kind(e) === kind(l.equipment)) ||
  (kind(l.equipment) === "van" && c.equipment.some((e) => kind(e) === "reefer"));

/**
 * One decision per screen: who you are, which load, then a single big button. Picking a
 * card moves on by itself; "back" and the summary's "change" links go the other way.
 */
export function Setup({
  carrier,
  load,
  onCarrier,
  onLoad,
  onCall,
  onSample,
  onBack,
  initial = "carrier",
}: {
  carrier: Carrier;
  load: Load;
  onCarrier: (c: Carrier) => void;
  onLoad: (l: Load) => void;
  onCall: () => void;
  onSample: () => void;
  onBack: () => void;
  initial?: Step;
}) {
  const { t } = useLang();
  const [step, setStep] = useState<Step>(initial);

  const back = () => (step === "carrier" ? onBack() : setStep(step === "ready" ? "load" : "carrier"));

  return (
    <section className="relative mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col px-4 pb-16 pt-24 sm:px-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400 transition hover:text-white"
        >
          ← {t("back")}
        </button>
        {step !== "ready" && (
          <p className="holo-label">{t("step", { n: step === "carrier" ? 1 : 2 })}</p>
        )}
      </div>

      {step === "carrier" && (
        <div key="carrier" className="screen-in mt-8">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("pickCarrierTitle")}</h1>
          <p className="mt-3 max-w-xl text-neutral-400">{t("pickCarrierSub")}</p>
          <details className="group mt-3 max-w-xl text-sm text-neutral-500">
            <summary className="cursor-pointer list-none font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-holo)]/80 hover:text-[var(--color-holo)]">
              ? {t("mcHelpTitle")}
            </summary>
            <p className="mt-2 leading-relaxed">{t("mcHelp")}</p>
          </details>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {carriers.map((c) => (
              <li key={c.id}>
                <CarrierCard
                  carrier={c}
                  selected={c.id === carrier.id}
                  onPick={() => {
                    onCarrier(c);
                    setStep("load");
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === "load" && (
        <div key="load" className="screen-in mt-8">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{t("pickLoadTitle")}</h1>
          <p className="mt-3 max-w-xl text-neutral-400">{t("pickLoadSub")}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...loads]
              .sort((a, b) => Number(fits(carrier, b)) - Number(fits(carrier, a)))
              .map((l) => (
                <li key={l.id}>
                  <LoadCard
                    load={l}
                    fit={fits(carrier, l)}
                    selected={l.id === load.id}
                    onPick={() => {
                      onLoad(l);
                      setStep("ready");
                    }}
                  />
                </li>
              ))}
          </ul>
        </div>
      )}

      {step === "ready" && (
        <div key="ready" className="screen-in mx-auto mt-10 flex w-full max-w-2xl flex-col items-center text-center">
          <p className="holo-label">{t("readyTitle")}</p>
          <div className="glass mt-6 w-full rounded-3xl p-6 text-left sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">{t("readyYou")}</p>
                <p className="mt-1 text-2xl font-semibold">{carrier.company}</p>
                <p className="mt-1 font-mono text-sm text-neutral-400">
                  MC {carrier.mc} · {carrier.equipment.join(", ")} · {carrier.base.city}, {carrier.base.state}
                </p>
              </div>
              <button type="button" onClick={() => setStep("carrier")} className="font-mono text-xs text-neutral-500 underline-offset-4 hover:text-white hover:underline">
                {t("change")}
              </button>
            </div>
            <div className="my-6 h-px bg-white/10" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-neutral-500">{t("readyAbout")}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {load.origin.city} → {load.destination.city}
                </p>
                <p className="mt-1 font-mono text-sm text-neutral-400">
                  {load.id} · {load.miles.toLocaleString("en-US")} mi · {load.equipment}
                </p>
              </div>
              <button type="button" onClick={() => setStep("load")} className="font-mono text-xs text-neutral-500 underline-offset-4 hover:text-white hover:underline">
                {t("change")}
              </button>
            </div>
          </div>
          <div className="mt-10">
            <Magnetic>
              <button
                type="button"
                onClick={onCall}
                className="pulse-ring rounded-full bg-[var(--color-amber)] px-10 py-4 text-lg font-semibold text-neutral-950 transition hover:brightness-110"
              >
                {t("readyCta")} →
              </button>
            </Magnetic>
          </div>
          <p className="mt-4 text-sm text-neutral-500">{t("readyMic")}</p>
          <button type="button" onClick={onSample} className="mt-6 text-sm text-neutral-400 underline-offset-4 hover:text-white hover:underline">
            ▶ {t("readySample")}
          </button>
        </div>
      )}
    </section>
  );
}

function CarrierCard({ carrier, selected, onPick }: { carrier: Carrier; selected: boolean; onPick: () => void }) {
  const { t, l } = useLang();
  return (
    <Tilt className="h-full rounded-2xl">
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        className={`glass group flex h-full w-full flex-col rounded-2xl p-5 text-left transition ${
          selected ? "border-[var(--color-amber)]/70" : "hover:border-white/25"
        }`}
      >
        <TruckGlyph equipment={carrier.equipment[carrier.equipment.length - 1]} className="h-10 w-28 text-[var(--color-holo)]/80 transition group-hover:text-[var(--color-holo)]" />
        <p className="mt-4 text-lg font-semibold text-neutral-50">{carrier.company}</p>
        <p className="mt-1 font-mono text-xs text-neutral-400">
          MC {carrier.mc} · {carrier.base.city}, {carrier.base.state}
        </p>
        <p className="mt-1 font-mono text-xs text-neutral-500">
          {carrier.equipment.join(" + ")} · {t("trucks", { n: carrier.trucks })}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">{l(carrier.persona)}</p>
      </button>
    </Tilt>
  );
}

function LoadCard({ load, fit, selected, onPick }: { load: Load; fit: boolean; selected: boolean; onPick: () => void }) {
  const { t, l, lang } = useLang();
  return (
    <Tilt className="h-full rounded-2xl">
      <button
        type="button"
        onClick={onPick}
        aria-pressed={selected}
        className={`glass group flex h-full w-full flex-col rounded-2xl p-5 text-left transition ${
          selected ? "border-[var(--color-amber)]/70" : "hover:border-white/25"
        } ${fit ? "" : "opacity-70"}`}
      >
        <div className="flex items-center justify-between">
          <RouteGlyph className="h-6 w-20 text-[var(--color-holo)]/70 transition group-hover:text-[var(--color-holo)]" />
          <span className="font-mono text-[11px] text-neutral-500">{load.id}</span>
        </div>
        <p className="mt-3 text-lg font-semibold leading-snug text-neutral-50">
          {load.origin.city} → {load.destination.city}
        </p>
        <p className="mt-1 font-mono text-xs text-neutral-400">
          {load.miles.toLocaleString("en-US")} mi · {formatDay(lang, load.origin.date)} · {load.equipment}
        </p>
        <p className="mt-2 text-sm text-neutral-400">{l(load.commodity)}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4 font-mono text-[11px]">
          <span className={`flex min-w-0 items-start gap-1.5 text-balance leading-snug ${fit ? "text-[var(--color-holo)]" : "text-neutral-500"}`}>
            {fit ? <Check className="mt-px h-3.5 w-3.5 shrink-0" /> : <Cross className="mt-px h-3.5 w-3.5 shrink-0" />}
            {fit ? t("fits") : t("noFit")}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-amber)]/40 px-2 py-0.5 text-[var(--color-amber)]">
            {t("rateHidden")}
          </span>
        </div>
      </button>
    </Tilt>
  );
}
