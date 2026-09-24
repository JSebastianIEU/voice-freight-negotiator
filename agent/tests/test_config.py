"""Settings can be built explicitly (tests) or from the environment (runtime)."""

import pytest
from pydantic import ValidationError

from freight_negotiator.config import Settings

REQUIRED = {
    "livekit_url": "wss://example.livekit.cloud",
    "livekit_api_key": "key",
    "livekit_api_secret": "secret",
}


def test_defaults_are_the_documented_stack() -> None:
    s = Settings(**REQUIRED, _env_file=None)
    assert s.stt_model == "deepgram/nova-3"
    assert s.llm_model.startswith("deepseek-ai/")
    assert s.tts_model == "cartesia/sonic-3"
    assert s.tts_voice is None


def test_environment_overrides_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    for key, value in REQUIRED.items():
        monkeypatch.setenv(key.upper(), value)
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-4.1-mini")
    monkeypatch.setenv("LLM_TEMPERATURE", "0.0")

    s = Settings(_env_file=None)
    assert s.llm_model == "openai/gpt-4.1-mini"
    assert s.llm_temperature == 0.0


def test_missing_credentials_fail_loudly(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in REQUIRED:
        monkeypatch.delenv(key.upper(), raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_endpointing_defaults_are_faster_than_framework() -> None:
    s = Settings(**REQUIRED, _env_file=None)
    assert s.endpointing_min_delay <= s.endpointing_max_delay
    assert s.endpointing_max_delay < 3.0  # the framework default we measured as too slow


def test_temperature_is_bounded() -> None:
    with pytest.raises(ValidationError):
        Settings(**REQUIRED, llm_temperature=3.0, _env_file=None)
