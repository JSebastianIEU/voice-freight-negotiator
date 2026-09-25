"""Milestone 3: the negotiator whose prompt has no numbers in it.

The model knows the load and the persona; the money lives in ``guardian/``. Two layers:

1. every figure the model says comes back from ``propose_rate`` / ``accept_rate``, whose
   replies never contain the range (guardian/tools.py);
2. the model's text is screened sentence by sentence before TTS, and a sentence with an
   amount the guardian never saw is replaced (guardian/output_filter.py).

One ``Negotiation`` per call holds the ladder, the current offer and the allow-list.
"""

from __future__ import annotations

from collections.abc import AsyncIterable
from pathlib import Path
from typing import Any

from livekit.agents import Agent, ModelSettings, llm

from freight_negotiator.agents.persona import BROKER_NAME, REP_NAME, greeting_instructions
from freight_negotiator.guardian.events import Publisher
from freight_negotiator.guardian.output_filter import block_event, screen_llm_stream
from freight_negotiator.guardian.policy import Negotiation
from freight_negotiator.guardian.tools import guardian_tools
from freight_negotiator.loads import Load

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "negotiator.md"


def render_prompt(load: Load, *, broker_name: str = BROKER_NAME, rep_name: str = REP_NAME) -> str:
    """Persona and load only. Pure, so a test can assert no price is in the text."""
    template = PROMPT_PATH.read_text(encoding="utf-8")
    return template.format(rep_name=rep_name, broker_name=broker_name, load_brief=load.brief())


class NegotiatorAgent(Agent):
    """Carrier sales rep for one load, with the price guardian in code."""

    def __init__(
        self,
        load: Load,
        *,
        publish: Publisher | None = None,
        negotiation: Negotiation | None = None,
    ) -> None:
        self.load = load
        self.negotiation = negotiation or Negotiation(load.prices)
        self._publish = publish
        self._pending_events: list[Any] = []
        super().__init__(
            instructions=render_prompt(load),
            tools=guardian_tools(self.negotiation, load, publish),
        )

    @property
    def greeting_instructions(self) -> str:
        return greeting_instructions(self.load.spoken_lane)

    def allowed_amounts(self) -> set[int]:
        """What the desk offered or booked: sayable in any sentence."""
        return self.negotiation.offered

    def declinable_amounts(self) -> set[int]:
        """What the carrier asked for: sayable only to decline it."""
        return self.negotiation.asked

    async def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool],
        model_settings: ModelSettings,
    ) -> AsyncIterable[llm.ChatChunk | str]:
        """The default LLM node, with the output filter on its text."""
        stream = Agent.default.llm_node(self, chat_ctx, tools, model_settings)

        def on_block(sentence: str, unknown: list[int]) -> None:
            self._pending_events.append(block_event(sentence, unknown))

        async for item in screen_llm_stream(
            stream, self.allowed_amounts, on_block, declinable=self.declinable_amounts
        ):
            yield item
        # Blocks are published after the turn's text so they never delay the audio.
        if self._publish is not None:
            while self._pending_events:
                await self._publish(self._pending_events.pop(0))
