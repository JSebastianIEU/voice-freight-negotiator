"use client";

import { useCallback, useEffect, useState } from "react";

import { Footer, Header } from "@/components/experience/Chrome";
import { Debrief } from "@/components/experience/Debrief";
import { Hero } from "@/components/experience/Hero";
import { LiveCall } from "@/components/experience/LiveCall";
import { SampleCallView } from "@/components/experience/SampleCallView";
import { Setup } from "@/components/experience/Setup";
import { Story } from "@/components/experience/Story";
import { PointerField } from "@/components/fx/PointerField";
import { type Carrier, type Load, carriers, findCarrier, findLoad, loads } from "@/lib/catalog";
import type { GuardianEvent } from "@/lib/guardian";
import { LangProvider } from "@/lib/i18n";
import { SAMPLE_CARRIER_ID, SAMPLE_LOAD_ID } from "@/lib/sample";

type Mode =
  | { kind: "landing" }
  | { kind: "setup"; step: "carrier" | "load" | "ready"; error?: string }
  | { kind: "call"; sample: boolean; id: number }
  | { kind: "debrief"; sample: boolean; events: GuardianEvent[] };

/**
 * The whole site as one small state machine:
 *
 *   landing ──call──▶ setup (who you are → which load → call) ──▶ call ──hang up──▶ debrief
 *      └──sample──▶ call (scripted) ─────────────────────────────────────────────────┘
 *
 * Each screen is one idea with one obvious action. The pointer lights the grid on every
 * screen; the core and the explainer react to it.
 */
export function Experience() {
  return (
    <LangProvider>
      <Inner />
    </LangProvider>
  );
}

function Inner() {
  const [mode, setMode] = useState<Mode>({ kind: "landing" });
  const [carrier, setCarrier] = useState<Carrier>(carriers[0]);
  const [load, setLoad] = useState<Load>(loads[0]);

  useEffect(() => {
    if (mode.kind !== "landing") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [mode.kind]);

  const home = useCallback(() => {
    setMode({ kind: "landing" });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);
  const setup = useCallback(() => setMode({ kind: "setup", step: "carrier" }), []);
  const call = useCallback(() => setMode({ kind: "call", sample: false, id: Date.now() }), []);
  const sample = useCallback(() => setMode({ kind: "call", sample: true, id: Date.now() }), []);
  const end = useCallback(
    (events: GuardianEvent[]) =>
      setMode((m) => ({ kind: "debrief", sample: m.kind === "call" && m.sample, events })),
    [],
  );
  const fail = useCallback((message: string) => setMode({ kind: "setup", step: "ready", error: message }), []);

  const sampleCarrier = findCarrier(SAMPLE_CARRIER_ID);
  const sampleLoad = findLoad(SAMPLE_LOAD_ID);
  const isSample = (mode.kind === "call" || mode.kind === "debrief") && mode.sample;

  return (
    <>
      <PointerField />
      <Header onHome={home} showHow={mode.kind === "landing"} />
      <main className="relative z-10 flex min-h-[100svh] flex-col">
        {mode.kind === "landing" && (
          <>
            <Hero onCall={setup} onSample={sample} />
            <Story onCall={setup} onSample={sample} />
            <Footer />
          </>
        )}

        {mode.kind === "setup" && (
          <>
            <Setup
              key={mode.step}
              carrier={carrier}
              load={load}
              onCarrier={setCarrier}
              onLoad={setLoad}
              onCall={call}
              onSample={sample}
              onBack={home}
              initial={mode.step}
            />
            {mode.error && (
              <p role="alert" className="mx-auto -mt-10 max-w-2xl px-4 text-center font-mono text-xs text-[var(--color-amber)]">
                {mode.error}
              </p>
            )}
          </>
        )}

        {mode.kind === "call" &&
          (mode.sample ? (
            <SampleCallView key={mode.id} carrier={sampleCarrier} load={sampleLoad} onEnd={end} />
          ) : (
            <LiveCall key={mode.id} carrier={carrier} load={load} onEnd={end} onError={fail} />
          ))}

        {mode.kind === "debrief" && (
          <Debrief
            load={isSample ? sampleLoad : load}
            carrier={isSample ? sampleCarrier : carrier}
            events={mode.events}
            sample={mode.sample}
            onAgain={call}
            onChange={setup}
            onHome={home}
          />
        )}
      </main>
    </>
  );
}
