"use client";

import {
  DisconnectButton,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useLocalParticipant,
  useTranscriptions,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useMemo } from "react";

import { AgentStatus } from "@/components/AgentStatus";
import { CallLog, type Line } from "@/components/CallLog";
import { CarrierCard } from "@/components/CarrierCard";
import { Moves } from "@/components/Moves";
import { Stages } from "@/components/Stages";
import type { Carrier, Load } from "@/lib/catalog";
import type { GuardianEvent } from "@/lib/guardian";
import { useLang } from "@/lib/i18n";
import { stageOf } from "@/lib/stages";

/**
 * The right column while connected: status, your card, where the call is, the moves
 * and the log. Rendered inside LiveKitRoom, so every hook here has a room. The core
 * itself lives outside the room (see CallView) and gets its signals from LiveSignals.
 */
export function CallSession({
  roomName,
  carrier,
  load,
  events,
}: {
  roomName: string;
  carrier: Carrier;
  load: Load;
  events: GuardianEvent[];
}) {
  const { t } = useLang();
  const streams = useTranscriptions();
  const { localParticipant } = useLocalParticipant();

  // One time-ordered log of both voices and every verdict; also what the stage reads.
  const lines = useMemo<Line[]>(() => {
    const spoken: Line[] = streams.map((s) => ({
      kind: s.participantInfo.identity === localParticipant.identity ? "carrier" : "agent",
      id: s.streamInfo.id,
      at: s.streamInfo.timestamp / 1000,
      text: s.text,
      interim: s.streamInfo.attributes?.["lk.transcription_final"] === "false",
    }));
    const verdicts: Line[] = events.map((e, i) => ({
      kind: "guardian",
      id: `g-${i}-${e.ts}`,
      at: e.ts,
      event: e,
    }));
    return [...spoken, ...verdicts].sort((a, b) => a.at - b.at);
  }, [streams, events, localParticipant.identity]);

  const stage = useMemo(
    () =>
      stageOf(
        lines.flatMap((l) => (l.kind === "guardian" ? [] : [{ who: l.kind, text: l.text, final: !l.interim }])),
        events,
        carrier.mc,
      ),
    [lines, events, carrier.mc],
  );

  return (
    <div className="flex h-full min-w-0 flex-col gap-4">
      {/* Plays every remote audio track (the agent's voice). Without it, silence. */}
      <RoomAudioRenderer />
      {/* Browsers block autoplay until a user gesture; shows a button only if needed. */}
      <StartAudio
        label={t("enableAudio")}
        className="rounded-full border border-amber-300/60 px-4 py-2 font-mono text-xs text-amber-200"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-neutral-500">
        <AgentStatus />
        <span className="truncate">
          {t("room")} {roomName}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <DisconnectButton className="rounded-full bg-neutral-100 px-5 py-2 font-mono text-xs font-medium text-neutral-950 hover:bg-white">
          {t("hangUp")}
        </DisconnectButton>
        <TrackToggle
          source={Track.Source.Microphone}
          className="rounded-full border border-neutral-700 px-4 py-2 font-mono text-xs text-neutral-300 hover:border-neutral-500"
        />
      </div>

      <Stages stage={stage} />
      <CarrierCard carrier={carrier} />
      <Moves load={load} />
      <CallLog lines={lines} />
    </div>
  );
}
