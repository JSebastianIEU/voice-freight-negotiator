"""Typed settings for the agent, loaded from the environment.

Why a settings class instead of ``os.environ`` calls scattered around:
- one place lists every knob the agent has, with its default and its meaning;
- a missing or malformed value fails at startup with a clear message, not
  mid-call with a stack trace from deep inside a plugin;
- tests can build a ``Settings`` object directly without touching the environment.

Model identifiers are plain strings understood by LiveKit Inference
(``provider/model``). Keeping them here, and overridable from ``.env.local``,
means swapping a model is a config change, not a code change.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- LiveKit Cloud -------------------------------------------------------------
    # The LiveKit SDK reads these same variables itself. They are declared here only
    # so a missing credential is reported before the worker tries to connect.
    livekit_url: str = Field(description="wss://<project>.livekit.cloud")
    livekit_api_key: str
    livekit_api_secret: str

    # --- Speech to text ------------------------------------------------------------
    stt_model: str = Field(
        default="deepgram/nova-3",
        description="Streaming STT. Nova-3 is strong on numbers, which negotiations are full of.",
    )
    stt_language: str = Field(
        default="en",
        description="BCP-47 code, or 'multi' for automatic language detection (milestone 6).",
    )

    # --- Language model ------------------------------------------------------------
    llm_model: str = Field(
        default="deepseek-ai/deepseek-v3",
        description=(
            "Chat model, never a reasoning variant: thinking tokens are silence on a call. "
            "Chosen for cost; see docs/decisions/ADR-003-llm-choice.md."
        ),
    )
    llm_temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="Low: a negotiator should be consistent, not creative.",
    )

    # --- Text to speech ------------------------------------------------------------
    tts_model: str = Field(
        default="cartesia/sonic-3",
        description="Lowest time-to-first-byte among the Inference TTS options.",
    )
    tts_voice: str | None = Field(
        default=None,
        description="Provider voice id. None lets Inference pick the model's default voice.",
    )

    # --- Observability -------------------------------------------------------------
    log_level: str = Field(default="INFO")
    metrics_path: str = Field(
        default="metrics.jsonl",
        description="Per-turn latency records, one JSON object per line. See metrics.py.",
    )


def load_settings() -> Settings:
    """Build settings from the environment (and .env.local if present)."""
    return Settings()  # type: ignore[call-arg]  # required fields come from the environment
