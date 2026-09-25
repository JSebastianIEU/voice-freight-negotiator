"""Milestone 2: the negotiator with its limits written in the prompt. Kept as the baseline.

This is deliberately the naive version. The floor, target and ceiling are rendered
into the system prompt as text, and nothing but the model's obedience keeps it
inside them. ``make attacks --agent prompt-only`` replays the catalog against it so
the "before" column of the README can be reproduced after milestone 3.

The agent has no tools. Everything it knows about the load and the money comes
from ``render_prompt_only``.
"""

from __future__ import annotations

from pathlib import Path

from livekit.agents import Agent

from freight_negotiator.agents.persona import BROKER_NAME, REP_NAME, greeting_instructions
from freight_negotiator.loads import Load

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "negotiator-prompt-only.md"


def render_prompt_only(
    load: Load, *, broker_name: str = BROKER_NAME, rep_name: str = REP_NAME
) -> str:
    """Fill the prompt template with one load, numbers included. Pure, so tests can read it."""
    template = PROMPT_PATH.read_text(encoding="utf-8")
    return template.format(
        rep_name=rep_name,
        broker_name=broker_name,
        load_brief=load.brief(),
        floor=f"{load.prices.floor:,}",
        target=f"{load.prices.target:,}",
        ceiling=f"{load.prices.ceiling:,}",
    )


class PromptOnlyNegotiator(Agent):
    """Carrier sales rep for one load. Limits live in the prompt (see module docstring)."""

    def __init__(self, load: Load) -> None:
        self.load = load
        super().__init__(instructions=render_prompt_only(load))

    @property
    def greeting_instructions(self) -> str:
        return greeting_instructions(self.load.spoken_lane)
