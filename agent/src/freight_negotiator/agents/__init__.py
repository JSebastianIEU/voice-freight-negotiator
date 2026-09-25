"""Agent profiles: which persona answers the call, chosen by Settings.agent_profile."""

from __future__ import annotations

from dataclasses import dataclass

from livekit.agents import Agent

from freight_negotiator.agents.hello import HelloAgent
from freight_negotiator.agents.negotiator import NegotiatorAgent
from freight_negotiator.agents.prompt_only import PromptOnlyNegotiator
from freight_negotiator.config import Settings
from freight_negotiator.guardian.events import Publisher
from freight_negotiator.loads import find_load


@dataclass(frozen=True)
class Profile:
    agent: Agent
    """What the agent should do the moment the line opens."""
    greeting: str
    load_id: str | None = None


def build_profile(
    settings: Settings,
    *,
    publish: Publisher | None = None,
    load_id: str | None = None,
    lang: str = "en",
) -> Profile:
    """The agent for one call. ``load_id`` and ``lang`` come from the web client's dispatch."""
    if settings.agent_profile == "hello":
        return Profile(
            agent=HelloAgent(),
            greeting="Greet the user briefly and ask how you can help.",
        )
    load = find_load(load_id)
    if settings.agent_profile == "prompt-only":
        naive = PromptOnlyNegotiator(load)
        return Profile(agent=naive, greeting=naive.greeting_instructions, load_id=load.load_id)
    negotiator = NegotiatorAgent(load, publish=publish, lang=lang)
    return Profile(
        agent=negotiator, greeting=negotiator.greeting_instructions, load_id=load.load_id
    )
