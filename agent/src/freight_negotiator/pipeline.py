"""Wiring of the voice pipeline: VAD -> STT -> turn detection -> LLM -> TTS.

Everything model-related is decided here, from ``Settings``. Agents (the classes
that hold instructions and tools) stay free of provider details, so the same
agent can run against a different model by changing configuration only.
"""

from __future__ import annotations

import logging

from livekit.agents import AgentSession, TurnHandlingOptions, inference, room_io
from livekit.agents.vad import VAD
from livekit.agents.voice.turn import EndpointingOptions
from livekit.plugins import noise_cancellation, silero

from freight_negotiator.config import Settings

logger = logging.getLogger(__name__)


def load_vad() -> VAD:
    """Load the Silero voice-activity detector.

    Loading the ONNX model takes a few hundred milliseconds, so this is called
    once per worker process (see ``main.prewarm``) and the instance is shared
    by every call that process handles. VAD is the cheapest component and
    runs on CPU inside the worker: it answers "is someone speaking right now?"
    every few milliseconds, which gates the STT stream and powers interruptions.
    """
    return silero.VAD.load(
        # How long the user has to be silent before VAD reports "stopped speaking".
        # Kept short: the *semantic* end-of-turn decision is the turn detector's job,
        # not VAD's, so VAD only needs to notice that audio stopped.
        min_silence_duration=0.4,
    )


def build_session(settings: Settings, vad: VAD) -> AgentSession:
    """Assemble an ``AgentSession`` from settings.

    Why each piece is here rather than inside the agent class:
    - STT/LLM/TTS go through LiveKit Inference, so the only credential needed is
      the LiveKit one already in the environment.
    - Turn detection is LiveKit's end-of-utterance model. It reads the transcript
      and decides whether the speaker *finished* or just paused, which matters in
      negotiations where numbers are said with pauses ("thirty-two... fifty").
      ``local_fallback`` keeps a small on-device model if the hosted one is slow.
    """
    return AgentSession(
        vad=vad,
        stt=inference.STT(model=settings.stt_model, language=settings.stt_language),
        llm=inference.LLM(
            model=settings.llm_model,
            extra_kwargs={"temperature": settings.llm_temperature},
        ),
        tts=_build_tts(settings),
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(local_fallback=True),
            # The detector gives a probability that the user finished. Above its threshold
            # the turn ends after min_delay; below it, the session waits up to max_delay
            # in case more speech comes. Both are settings so the bench can sweep them.
            endpointing=EndpointingOptions(
                min_delay=settings.endpointing_min_delay,
                max_delay=settings.endpointing_max_delay,
            ),
        ),
    )


def _build_tts(settings: Settings) -> inference.TTS:
    # ``voice`` must be omitted, not passed as None, for Inference to pick the default.
    if settings.tts_voice:
        return inference.TTS(model=settings.tts_model, voice=settings.tts_voice)
    return inference.TTS(model=settings.tts_model)


def room_options() -> room_io.RoomOptions:
    """Room-level audio options shared by every agent.

    Background voice cancellation (BVC) is LiveKit's model that removes
    non-primary speakers and noise before audio reaches VAD/STT. Free on
    LiveKit Cloud and important later when the test bench adds background noise.
    """
    return room_io.RoomOptions(
        audio_input=room_io.AudioInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )
