"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useCallback, useState } from "react";

import { Briefing } from "@/components/Briefing";
import { CallSession } from "@/components/CallSession";
import { CarrierCard, CarrierPicker } from "@/components/CarrierCard";
import { Debrief } from "@/components/Debrief";
import { LiveSignals, SILENT, type Signals } from "@/components/LiveSignals";
import { LoadBoard } from "@/components/LoadBoard";
import { Orb } from "@/components/Orb";
import { type Carrier, type Load, carriers, loads } from "@/lib/catalog";
import { fetchConnectionDetails } from "@/lib/connection";
import { type Debrief as DebriefData, debriefOf } from "@/lib/debrief";
import { useLang } from "@/lib/i18n";
import type { ConnectionDetails } from "@/lib/types";

type Phase =
  | { kind: "briefing" }
  | { kind: "setup"; error?: string }
  | { kind: "requesting" }
  | { kind: "connected"; details: ConnectionDetails }
  | { kind: "debrief"; data: DebriefData };

/**
 * The whole experience, as a small state machine:
 *
 *   briefing ──start──▶ setup (pick carrier + load) ──call──▶ requesting ──▶ connected
 *                          ▲                                                   │ hang up
 *                          └──────── change setup ──── debrief ◀──────────────┘
 *
 * The core is ONE canvas rendered here, outside the room, for the whole life of the
 * page: before the call it sits centred; when the room connects the right column opens
 * and the core slides left (a flex-basis transition, no remount, no cut). LiveSignals,
 * inside the room, feeds it the live values. The guardian events collected during the
 * call are what the debrief is computed from.
 */
export function CallView() {
  const { t } = useLang();
  const [phase, setPhase] = useState<Phase>({ kind: "briefing" });
  const [carrier, setCarrier] = useState<Carrier>(carriers[0]);
  const [load, setLoad] = useState<Load>(loads[0]);
  const [signals, setSignals] = useState<Signals>(SILENT);

  const startCall = useCallback(async () => {
    setPhase({ kind: "requesting" });
    setSignals(SILENT);
    try {
      const details = await fetchConnectionDetails(load.id);
      setPhase({ kind: "connected", details });
    } catch (err) {
      setPhase({ kind: "setup", error: err instanceof Error ? err.message : String(err) });
    }
  }, [load.id]);

  const endCall = useCallback(() => {
    setPhase({ kind: "debrief", data: debriefOf(load, signals.events) });
  }, [load, signals.events]);

  // A failed WebRTC connection must not look like a normal hang-up.
  const failCall = useCallback((err: Error) => {
    setPhase({ kind: "setup", error: `Could not connect: ${err.message}` });
    setSignals(SILENT);
  }, []);

  const connected = phase.kind === "connected";
  const requesting = phase.kind === "requesting";
  const orbPhase = connected ? signals.phase : requesting ? "connecting" : "idle";
  const wide = connected || phase.kind === "setup" || requesting;

  return (
    <div className="flex w-full flex-col gap-6 md:flex-row md:items-start">
      {/* Left: the core. Its share of the row animates from all of it to about half. */}
      <div
        className="flex min-w-0 flex-col items-center gap-5 transition-[flex-basis] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ flexBasis: wide ? "44%" : "100%", flexGrow: 0, flexShrink: 0 }}
      >
        <Orb
          phase={orbPhase}
          agentLevel={signals.agentLevel}
          userLevel={signals.userLevel}
          events={signals.events}
          size={wide ? 300 : 360}
        />

        {phase.kind === "briefing" && <Briefing onStart={() => setPhase({ kind: "setup" })} />}

        {phase.kind === "debrief" && (
          <Debrief
            data={phase.data}
            onAgain={startCall}
            onChange={() => setPhase({ kind: "setup" })}
          />
        )}

        {(phase.kind === "setup" || requesting) && (
          <div className="flex w-full flex-col items-center gap-3">
            <CarrierCard carrier={carrier} />
            <button
              type="button"
              onClick={startCall}
              disabled={requesting}
              className="rounded-full bg-amber-300 px-6 py-2.5 font-mono text-sm font-medium text-neutral-950 transition hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
            >
              {requesting ? t("setupCalling") : t("setupCall")}
            </button>
            <p className="text-center text-xs text-neutral-500">{t("briefHeadphones")}</p>
            {phase.kind === "setup" && phase.error && (
              <p role="alert" className="text-center font-mono text-xs text-amber-200">
                {phase.error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: the board before the call, the live column during it. */}
      <div
        className="min-w-0 overflow-hidden transition-[flex-basis,opacity] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ flexBasis: wide ? "56%" : "0%", flexGrow: 0, flexShrink: 0, opacity: wide ? 1 : 0 }}
        aria-hidden={!wide}
      >
        {(phase.kind === "setup" || requesting) && (
          <div className="flex flex-col gap-5">
            <section>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                {t("setupCarrier")}
              </p>
              <CarrierPicker selected={carrier} onSelect={setCarrier} />
            </section>
            <section>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                {t("setupLoad")}
              </p>
              <LoadBoard selected={load} carrier={carrier} onSelect={setLoad} />
            </section>
          </div>
        )}

        {connected && (
          <LiveKitRoom
            serverUrl={phase.details.serverUrl}
            token={phase.details.participantToken}
            connect
            audio // publish the microphone as soon as we join
            video={false}
            onDisconnected={endCall}
            onError={failCall}
            className="h-full"
          >
            <LiveSignals onChange={setSignals} />
            <CallSession
              roomName={phase.details.roomName}
              carrier={carrier}
              load={load}
              events={signals.events}
            />
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}
