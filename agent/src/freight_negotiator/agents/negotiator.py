"""Milestone 2: the negotiator with its limits written in the prompt.

This is deliberately the naive version. The floor, target and ceiling are rendered
into the system prompt as text, and nothing but the model's obedience keeps it
inside them. Milestone 2 records how that fails under pressure (docs/attacks);
milestone 3 moves the limits into code.

The agent has no tools. Everything it knows about the load and the money comes
from ``render_prompt``.
"""

from __future__ import annotations

from pathlib import Path

from livekit.agents import Agent

from freight_negotiator.loads import Load

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "negotiator.md"

BROKER_NAME = "Lakeshore Freight"
REP_NAME = "Alex"


def render_prompt(load: Load, *, broker_name: str = BROKER_NAME, rep_name: str = REP_NAME) -> str:
    """Fill the prompt template with one load. Pure, so tests can inspect the text."""
    template = PROMPT_PATH.read_text(encoding="utf-8")
    return template.format(
        rep_name=rep_name,
        broker_name=broker_name,
        load_brief=load.brief(),
        floor=f"{load.prices.floor:,}",
        target=f"{load.prices.target:,}",
        ceiling=f"{load.prices.ceiling:,}",
    )


class NegotiatorAgent(Agent):
    """Carrier sales rep for one load. Limits live in the prompt (see module docstring)."""

    def __init__(self, load: Load) -> None:
        self.load = load
        super().__init__(instructions=render_prompt(load))

    @property
    def greeting_instructions(self) -> str:
        return (
            f"Answer the phone as {REP_NAME} from {BROKER_NAME}: greet the caller and ask "
            "which load they are calling about. One short sentence."
        )
