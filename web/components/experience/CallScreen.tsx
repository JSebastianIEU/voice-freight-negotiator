"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { Orb } from "@/components/Orb";
import { captionFor } from "@/lib/captions";
import type { Carrier, Load } from "@/lib/catalog";
import type { CallFeed, Line } from "@/lib/feed";
import { FILTER_REASON, isCarrier, usd } from "@/lib/guardian";
import { type StringKey, useLang } from "@/lib/i18n";
import { type Move, movesFor } from "@/lib/moves";
import type { AgentPhase } from "@/lib/phase";
import { focusLoad, nextMove, rejected, type Round, STAGES, type Stage, stageIndex, stageOf } from "@/lib/stages";

const STAGE_LABEL: Record<Stage, StringKey> = {
  identify: "stageIdentify",
  qualify: "stageQualify",
  load: "stageLoad",
  negotiate: "stageNegotiate",
  close: "stageClose",
};

const OBJECTIVE: Record<Stage, StringKey> = {
  identify: "objIdentify",
  qualify: "objQualify",
  load: "objLoad",
  negotiate: "objNegotiate",
  close: "objClose",
};

/** Titles for the steps inside the negotiation, which follow the desk turn by turn. */
const ROUND: Record<Round, StringKey> = {
  ask: "objNegotiate",
  counter: "objCounter",
  final: "objFinal",
  approved: "objApproved",
};

const STATUS: Record<AgentPhase, StringKey> = {
  idle: "statusIdle",
  connecting: "statusConnecting",
  listening: "statusListening",
  thinking: "statusThinking",
  speaking: "statusSpeaking",
  failed: "statusFailed",
};

/**
 * The call, for a live room or the scripted sample alike. What matters most is on top
 * and biggest: what to say next. Tricks under it, the transcript last. The core on the
 * left shows what Alex is doing and flinches at every decision of the desk.
 */
export function CallScreen({
  feed,
  carrier,
  load,
  sample = false,
  controls,
}: {
  feed: CallFeed;
  carrier: Carrier;
  load: Load;
  sample?: boolean;
  controls: ReactNode;
}) {
  const { t, reason } = useLang();
  const [trick, setTrick] = useState<Move | null>(null);

  const spoken = useMemo(
    () =>
      feed.lines.flatMap((l) =>
        l.kind === "guardian" ? [] : [{ who: l.kind, text: l.text, final: !l.interim }],
      ),
    [feed.lines],
  );
  const stage = stageOf(spoken, feed.events);
  const refused = rejected(feed.events);
  // The call can move to another load (find_loads); lines and tricks follow it.
  const current = focusLoad(load, feed.events);
  const next = nextMove(stage, carrier, current, feed.events);
  const moves = useMemo(() => movesFor(current, carrier), [current, carrier]);
  const connecting = feed.phase === "connecting" && feed.lines.length === 0;
  // Once the load is booked there is nothing left to try: the card shows the outcome.
  const active = stage === "close" ? null : trick;

  return (
    <section className="screen-in mx-auto grid w-full max-w-6xl items-start gap-6 px-4 pb-12 pt-24 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
      {/* Left: Alex */}
      <div className="flex flex-col items-center lg:sticky lg:top-24">
        <div className="flex w-full items-center justify-between">
          <p className="holo-label">{sample ? t("sampleBadge") : "Alex · Lakeshore Freight"}</p>
          <p className="font-mono text-xs text-neutral-400" aria-live="polite">
            {connecting ? t("callConnecting") : t(STATUS[feed.phase])}
          </p>
        </div>
        {/* Smaller on phones, so "your move" is on the first screen. */}
        <div className="w-full [--orb:min(30svh,260px)] lg:[--orb:min(46svh,420px)]">
          <Orb
            phase={feed.phase}
            agentLevel={feed.agentLevel}
            userLevel={feed.userLevel}
            events={feed.events}
            caption={(ev) => captionFor(ev, t, reason)}
            size="var(--orb)"
          />
        </div>
        <StageTrack stage={stage} refused={refused} />
      </div>

      {/* Right: you */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <YouCard carrier={carrier} load={current} />
          <div className="flex items-center gap-2">{controls}</div>
        </div>
        <Objective
          stage={stage}
          sample={sample}
          refused={refused}
          trick={active}
          round={next.round}
          line={active ? active.line : next.line}
          onClearTrick={() => setTrick(null)}
        />
        {stage !== "close" && <Tricks moves={moves} active={active?.id ?? null} onPick={setTrick} />}
        <Transcript lines={feed.lines} />
      </div>
    </section>
  );
}

function YouCard({ carrier, load }: { carrier: Carrier; load: Load }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <p className="text-sm font-semibold text-neutral-50">
        {carrier.company} <span className="font-mono text-xs font-normal text-[var(--color-holo)]">MC {carrier.mc}</span>
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-neutral-400">
        {carrier.equipment[0]} · {carrier.base.city} → {load.origin.city} → {load.destination.city}
      </p>
    </div>
  );
}

function StageTrack({ stage, refused }: { stage: Stage; refused: boolean }) {
  const { t } = useLang();
  const now = stageIndex(stage);
  return (
    <ol className="mt-2 grid w-full grid-cols-5 gap-1.5" aria-label="Call progress">
      {STAGES.map((s, i) => {
        const done = i < now;
        const current = i === now;
        const bad = refused && s === "qualify" && current;
        return (
          <li key={s} className="flex flex-col gap-1.5">
            <span
              className={`h-1 rounded-full transition-colors duration-500 ${
                bad ? "bg-neutral-200" : current ? "bg-[var(--color-amber)]" : done ? "bg-[var(--color-holo)]/70" : "bg-white/10"
              }`}
            />
            <span className={`truncate font-mono text-[10px] uppercase tracking-[0.12em] ${current ? "text-neutral-100" : "text-neutral-500"}`}>
              {t(STAGE_LABEL[s])}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Objective({
  stage,
  sample,
  refused,
  trick,
  round,
  line,
  onClearTrick,
}: {
  stage: Stage;
  sample: boolean;
  refused: boolean;
  trick: Move | null;
  round: Round | null;
  line: string;
  onClearTrick: () => void;
}) {
  const { t, l, lang } = useLang();
  const title = trick
    ? l(trick.name)
    : refused
      ? t("objRejected")
      : stage === "close" && sample
        ? t("objCloseSample")
        : round
          ? t(ROUND[round])
          : t(OBJECTIVE[stage]);
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--color-amber)]" />
      <p className="holo-label">{t("yourMove")}</p>
      <p className="mt-2 text-lg font-semibold leading-snug text-neutral-50 sm:text-xl">{title}</p>
      {trick && <p className="mt-1 text-sm text-neutral-400">{l(trick.idea)}</p>}
      {stage !== "close" && (
        <blockquote key={line} className="screen-in mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <p className="text-pretty text-lg leading-snug text-[var(--color-holo)] sm:text-xl">“{line}”</p>
          {lang === "es" && <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500">{t("sayThis")}</p>}
        </blockquote>
      )}
      {trick && (
        <button type="button" onClick={onClearTrick} className="mt-3 font-mono text-xs text-neutral-500 underline-offset-4 hover:text-white hover:underline">
          ← {t("backToSuggestion")}
        </button>
      )}
    </div>
  );
}

function Tricks({ moves, active, onPick }: { moves: Move[]; active: string | null; onPick: (m: Move | null) => void }) {
  const { t, l } = useLang();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="holo-label">{t("tricks")}</p>
        <p className="text-xs text-neutral-500">{t("tricksHint")}</p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {moves.map((m) => {
          const on = m.id === active;
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onPick(on ? null : m)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  on
                    ? "border-[var(--color-amber)] bg-[var(--color-amber)]/10 text-[var(--color-amber)]"
                    : "border-white/12 text-neutral-300 hover:border-white/35 hover:text-white"
                }`}
              >
                {m.identity ? "◎ " : ""}
                {l(m.name)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Transcript({ lines }: { lines: Line[] }) {
  const { t, reason } = useLang();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <section aria-label={t("transcript")} className="glass rounded-2xl">
      <p className="holo-label px-5 pt-4">{t("transcript")}</p>
      <div ref={box} className="mt-2 max-h-[34svh] space-y-2 overflow-y-auto px-5 pb-4 text-sm leading-relaxed lg:max-h-[38svh]">
        {lines.length === 0 && <p className="text-neutral-500">{t("transcriptEmpty")}</p>}
        {lines.map((line) => {
          if (line.kind === "guardian") {
            const e = line.event;
            let text = "";
            let tone = "text-neutral-400";
            if (isCarrier(e)) {
              if (e.type === "carrier.verified") {
                text = `✓ ${e.company ?? ""} · MC ${e.mc ?? ""} · ${t("capVerified")}`;
                tone = "text-[var(--color-amber)]";
              } else {
                text = `✕ MC ${e.mc ?? "?"} · ${t("capNotVerified")} · ${reason(e.reason)}`;
              }
            } else if (e.type === "load.focus") {
              text = `→ ${t("capLoad")} ${e.loadId}`;
            } else {
              const verb =
                e.type === "rate.proposed"
                  ? t("capOffered")
                  : e.type === "rate.accepted"
                    ? t(e.reason === "booked" ? "capBooked" : "capApproved")
                    : t("capBlocked");
              const why = e.reason === FILTER_REASON ? t("capFiltered") : reason(e.reason);
              text = `${usd.format(e.amount)} · ${verb}${why && e.type !== "rate.accepted" ? ` · ${why}` : ""}`;
              tone = e.type === "rate.accepted" ? "text-[var(--color-amber)]" : e.type === "rate.rejected" ? "text-neutral-400" : "text-neutral-200";
            }
            return (
              <p key={line.id} className={`flex gap-3 font-mono text-xs ${tone}`}>
                <span className="w-12 shrink-0 text-neutral-600">{t("whoCode")}</span>
                <span>{text}</span>
              </p>
            );
          }
          return (
            <p key={line.id} className={`flex gap-3 ${line.interim ? "opacity-50" : ""}`}>
              <span className={`w-12 shrink-0 font-mono text-xs leading-6 ${line.kind === "agent" ? "text-[var(--color-holo)]" : "text-neutral-500"}`}>
                {line.kind === "agent" ? t("whoAlex") : t("whoYou")}
              </span>
              <span className={line.kind === "agent" ? "text-neutral-100" : "text-neutral-300"}>{line.text}</span>
            </p>
          );
        })}
      </div>
    </section>
  );
}
