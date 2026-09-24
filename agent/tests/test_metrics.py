"""turn_record() flattens the framework's per-turn report; the recorder appends JSONL."""

import json
from pathlib import Path

from freight_negotiator.metrics import TurnMetricsRecorder, turn_record


def test_assistant_turn_keeps_latency_fields_and_model_metadata() -> None:
    report = {
        "llm_node_ttft": 0.42,
        "tts_node_ttfb": 0.15,
        "e2e_latency": 0.9,
        "llm_metadata": {"model_name": "deepseek-v3", "model_provider": "baseten"},
        "provider_request_ids": {"llm": "abc"},  # not copied: noise for our purposes
    }
    rec = turn_record("assistant", report, now=123.0)
    assert rec == {
        "ts": 123.0,
        "role": "assistant",
        "interrupted": False,
        "llm_node_ttft": 0.42,
        "tts_node_ttfb": 0.15,
        "e2e_latency": 0.9,
        "llm_metadata": {"model_name": "deepseek-v3", "model_provider": "baseten"},
    }


def test_user_turn_keeps_end_of_turn_fields() -> None:
    rec = turn_record("user", {"transcription_delay": 0.2, "end_of_turn_delay": 0.35}, now=1.0)
    assert rec is not None
    assert rec["role"] == "user"
    assert rec["end_of_turn_delay"] == 0.35


def test_messages_without_latency_data_are_skipped() -> None:
    assert turn_record("assistant", None) is None
    assert turn_record("assistant", {}) is None
    assert turn_record("assistant", {"started_speaking_at": 5.0}) is None


def test_recorder_appends_one_json_line_per_record(tmp_path: Path) -> None:
    out = tmp_path / "metrics.jsonl"
    recorder = TurnMetricsRecorder(out)
    recorder.write({"role": "user", "end_of_turn_delay": 0.3})
    recorder.write({"role": "assistant", "e2e_latency": 0.8})

    lines = out.read_text(encoding="utf-8").splitlines()
    assert [json.loads(line)["role"] for line in lines] == ["user", "assistant"]
