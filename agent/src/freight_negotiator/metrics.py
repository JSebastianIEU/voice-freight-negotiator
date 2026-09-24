"""Per-turn latency records, one JSON object per line.

The README promises a *measured* response latency, so every conversation turn is
written to a JSONL file as it happens. The framework already computes the
numbers (``ChatMessage.metrics``); this module only persists them in a shape
that is easy to load into pandas later for the test bench.

What the fields mean (all in seconds, all optional):
- user turns: ``transcription_delay`` (speech end -> final transcript) and
  ``end_of_turn_delay`` (speech end -> decision that the user finished).
- assistant turns: ``llm_node_ttft`` (LLM time to first token), ``tts_node_ttfb``
  (TTS time to first audio byte) and ``e2e_latency`` (user stopped speaking ->
  first agent audio). ``e2e_latency`` is the number a caller actually perceives.
"""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from livekit.agents import AgentSession
from livekit.agents.llm import ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent

logger = logging.getLogger(__name__)

# Keys copied from ChatMessage.metrics into the record, when present.
LATENCY_KEYS: tuple[str, ...] = (
    "transcription_delay",
    "end_of_turn_delay",
    "llm_node_ttft",
    "llm_node_ttfs",
    "tts_node_ttfb",
    "playback_latency",
    "e2e_latency",
)


def turn_record(
    role: str,
    report: Mapping[str, Any] | None,
    *,
    interrupted: bool = False,
    now: float | None = None,
) -> dict[str, Any] | None:
    """Flatten a ``MetricsReport`` into one JSON-serialisable record.

    Returns ``None`` when the message carries no latency data at all (for
    example the agent's opening greeting, which has no user turn before it).
    Pure function so it can be unit-tested without a LiveKit session.
    """
    if not report:
        return None
    latencies = {k: report[k] for k in LATENCY_KEYS if k in report}
    if not latencies:
        return None

    record: dict[str, Any] = {
        "ts": now if now is not None else time.time(),
        "role": role,
        "interrupted": interrupted,
        **latencies,
    }
    for meta_key in ("llm_metadata", "tts_metadata", "stt_metadata"):
        meta = report.get(meta_key)
        if meta:
            record[meta_key] = dict(meta)
    return record


class TurnMetricsRecorder:
    """Appends one record per conversation turn to a JSONL file."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def attach(self, session: AgentSession) -> None:
        session.on("conversation_item_added", self._on_item)

    def _on_item(self, ev: ConversationItemAddedEvent) -> None:
        item = ev.item
        if not isinstance(item, ChatMessage):
            return
        record = turn_record(item.role, item.metrics, interrupted=item.interrupted)
        if record is None:
            return
        self.write(record)
        if item.role == "assistant" and "e2e_latency" in record:
            logger.info(
                "turn latency e2e=%.0f ms (llm ttft=%.0f ms, tts ttfb=%.0f ms)",
                record["e2e_latency"] * 1000,
                record.get("llm_node_ttft", 0.0) * 1000,
                record.get("tts_node_ttfb", 0.0) * 1000,
            )

    def write(self, record: Mapping[str, Any]) -> None:
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
