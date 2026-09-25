"""The negotiator: a carrier sales rep whose prompt has no numbers and no authority.

The model knows the persona and the posting the caller clicked. Everything that decides
something lives in ``guardian/``, behind four tools (``guardian/desk.py``):

1. **who is calling**: ``verify_carrier`` checks the MC number in the carrier directory;
   until it succeeds, the desk refuses to talk money;
2. **which load**: ``find_loads`` searches the board, public details only;
3. **what it pays**: ``propose_rate`` / ``accept_rate`` answer from the concession policy,
   one negotiation per load, and never return a bound;
4. **what reaches the speaker**: the model's text is screened sentence by sentence before
   TTS; a sentence with an amount the desk never offered is replaced, and a carrier's own
   number may be repeated only to decline it (``guardian/output_filter.py``).

One ``CallState`` per call holds all of it.
"""

from __future__ import annotations

from collections.abc import AsyncIterable, Mapping
from pathlib import Path
from typing import Any

from livekit.agents import Agent, ModelSettings, llm

from freight_negotiator.agents.persona import BROKER_NAME, REP_NAME, greeting_instructions
from freight_negotiator.carriers import DIRECTORY, CarrierDirectory
from freight_negotiator.guardian.desk import CallState
from freight_negotiator.guardian.events import Publisher
from freight_negotiator.guardian.output_filter import block_event, screen_llm_stream
from freight_negotiator.guardian.policy import Negotiation
from freight_negotiator.guardian.tools import guardian_tools
from freight_negotiator.loads import CATALOG, Load

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "negotiator.md"


def render_prompt(load: Load, *, broker_name: str = BROKER_NAME, rep_name: str = REP_NAME) -> str:
    """Persona and the posted load only. Pure, so a test can assert no price is in the text."""
    template = PROMPT_PATH.read_text(encoding="utf-8")
    return template.format(rep_name=rep_name, broker_name=broker_name, load_brief=load.brief())


class NegotiatorAgent(Agent):
    """Carrier sales rep, with carrier verification and the price guardian in code."""

    def __init__(
        self,
        load: Load,
        *,
        publish: Publisher | None = None,
        loads: Mapping[str, Load] | None = None,
        directory: CarrierDirectory | None = None,
        call: CallState | None = None,
    ) -> None:
        self.load = load
        board = dict(loads if loads is not None else CATALOG)
        board.setdefault(load.load_id, load)
        self.call = call or CallState(
            posted=load, loads=board, directory=directory if directory is not None else DIRECTORY
        )
        self._publish = publish
        self._pending_events: list[Any] = []
        super().__init__(instructions=render_prompt(load), tools=guardian_tools(self.call, publish))

    @property
    def greeting_instructions(self) -> str:
        return greeting_instructions(self.load.spoken_lane)

    @property
    def negotiation(self) -> Negotiation:
        """The negotiation on the posted load (the attack replay reads this one)."""
        return self.call.negotiation(self.load.load_id)

    def allowed_amounts(self) -> set[int]:
        """What the desk offered or booked, on any load: sayable in any sentence."""
        return self.call.speakable()

    def declinable_amounts(self) -> set[int]:
        """What the caller asked for: sayable only to decline it."""
        return self.call.declinable()

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
