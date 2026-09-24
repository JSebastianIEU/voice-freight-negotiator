"""Agent profiles: which persona answers the call, chosen by Settings.agent_profile."""

from __future__ import annotations

from dataclasses import dataclass

from livekit.agents import Agent

from freight_negotiator.agents.hello import HelloAgent
from freight_negotiator.agents.negotiator import NegotiatorAgent
from freight_negotiator.config import Settings
from freight_negotiator.loads import SAMPLE_LOAD


@dataclass(frozen=True)
class Profile:
    agent: Agent
    """What the agent should do the moment the line opens."""
    greeting: str


def build_profile(settings: Settings) -> Profile:
    if settings.agent_profile == "hello":
        return Profile(
            agent=HelloAgent(),
            greeting="Greet the user briefly and ask how you can help.",
        )
    negotiator = NegotiatorAgent(SAMPLE_LOAD)
    return Profile(agent=negotiator, greeting=negotiator.greeting_instructions)
