"use client";

import {
  DisconnectButton,
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  TrackToggle,
  useLocalParticipant,
  useTrackVolume,
  useTranscriptions,
  useVoiceAssistant,
  type AgentState,
} from "@livekit/components-react";
import { type LocalAudioTrack, Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CallScreen } from "@/components/experience/CallScreen";
import type { Carrier, Load } from "@/lib/catalog";
import { fetchConnectionDetails } from "@/lib/connection";
import { type CallFeed, EMPTY_FEED, type Line, mergeLines } from "@/lib/feed";
import type { GuardianEvent } from "@/lib/guardian";
import { useLang } from "@/lib/i18n";
import type { AgentPhase } from "@/lib/phase";
import type { ConnectionDetails } from "@/lib/types";
import { useGuardianEvents } from "@/lib/useGuardianEvents";

/**
 * A real call: ask our server for a token scoped to one fresh room (with a dispatch for
 * Alex and the chosen load), join it with the microphone on, and turn the room into the
 * same feed the sample produces. Hanging up hands every desk event to the debrief.
 */
export function LiveCall({
  carrier,
  load,
  onEnd,
  onError,
}: {
  carrier: Carrier;
  load: Load;
  onEnd: (events: GuardianEvent[]) => void;
  onError: (message: string) => void;
}) {
  const { t } = useLang();
  const [details, setDetails] = useState<ConnectionDetails | null>(null);
  const [feed, setFeed] = useState<CallFeed>(EMPTY_FEED);
  const events = useRef<GuardianEvent[]>([]);
  const started = useRef(false);

  useEffect(() => {
    // Once per mount, even under StrictMode's double effects: every token is a room and
    // every room dispatches an agent.
    if (started.current) return;
    started.current = true;
    fetchConnectionDetails(load.id)
      .then(setDetails)
      .catch((err: unknown) => onError(err instanceof Error ? err.message : String(err)));
  }, [load.id, onError]);

  const onFeed = useCallback((f: CallFeed) => {
    events.current = f.events;
    setFeed(f);
  }, []);
  const hangUp = useCallback(() => onEnd(events.current), [onEnd]);

  if (!details) {
    return (
      <CallScreen
        feed={EMPTY_FEED}
        carrier={carrier}
        load={load}
        controls={<span className="font-mono text-xs text-neutral-500">{t("callConnecting")}</span>}
      />
    );
  }

  return (
    <LiveKitRoom
      serverUrl={details.serverUrl}
      token={details.participantToken}
      connect
      audio
      video={false}
      onDisconnected={hangUp}
      onError={(err) => onError(err.message)}
    >
      <RoomAudioRenderer />
      <LiveFeed onFeed={onFeed} />
      <CallScreen
        feed={feed}
        carrier={carrier}
        load={load}
        controls={
          <>
            <StartAudio
              label={t("enableAudio")}
              className="rounded-full border border-[var(--color-amber)]/60 px-4 py-2 text-xs text-[var(--color-amber)]"
            />
            <TrackToggle
              source={Track.Source.Microphone}
              className="rounded-full border border-white/15 px-3 py-2 text-xs text-neutral-300 hover:border-white/40"
            />
            <DisconnectButton className="rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-950 transition hover:bg-white">
              {t("hangUp")}
            </DisconnectButton>
          </>
        }
      />
    </LiveKitRoom>
  );
}

/** Reads the room (inside LiveKitRoom) and reports one feed per change. Renders nothing. */
function LiveFeed({ onFeed }: { onFeed: (f: CallFeed) => void }) {
  const { state, audioTrack } = useVoiceAssistant();
  const { localParticipant, microphoneTrack } = useLocalParticipant();
  const streams = useTranscriptions();
  const events = useGuardianEvents();

  const micTrack =
    microphoneTrack?.track?.kind === Track.Kind.Audio ? (microphoneTrack.track as LocalAudioTrack) : undefined;
  const agentLevel = useTrackVolume(audioTrack);
  const userLevel = useTrackVolume(micTrack);

  const lines = useMemo<Line[]>(() => {
    const spoken: Line[] = streams.map((s) => ({
      kind: s.participantInfo.identity === localParticipant.identity ? "carrier" : "agent",
      id: s.streamInfo.id,
      at: s.streamInfo.timestamp / 1000,
      text: s.text,
      interim: s.streamInfo.attributes?.["lk.transcription_final"] === "false",
    }));
    return mergeLines(spoken, events);
  }, [streams, events, localParticipant.identity]);

  useEffect(() => {
    onFeed({ phase: toPhase(state), agentLevel: shape(agentLevel), userLevel: shape(userLevel), lines, events });
  }, [onFeed, state, agentLevel, userLevel, lines, events]);

  return null;
}

function toPhase(state: AgentState): AgentPhase {
  switch (state) {
    case "listening":
    case "thinking":
    case "speaking":
      return state;
    case "failed":
      return "failed";
    case "idle":
      return "idle";
    default:
      return "connecting";
  }
}

/** Raw analyser volume is quiet and linear; lift it so speech moves the core. */
function shape(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(1, Math.sqrt(Math.max(0, level)) * 1.6);
}
