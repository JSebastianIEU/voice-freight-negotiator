"""Agent worker entrypoint.

Run from ``agent/``:

    uv run -m livekit.agents download-files   # once: fetch local model weights
    uv run main.py console          # talk from the terminal, no room needed
    uv run main.py dev              # connect to LiveKit Cloud with auto-reload
    uv run main.py start            # production

The worker is *not* an HTTP server. It opens a WebSocket to LiveKit Cloud and
waits for jobs; LiveKit dispatches one each time a room needs an agent. That
is why, in production, it must run as an always-on process (see ADR-006).
"""

from __future__ import annotations

import logging

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, JobContext, JobProcess

from freight_negotiator.agents.hello import HelloAgent
from freight_negotiator.config import load_settings
from freight_negotiator.pipeline import build_session, load_vad, room_options

# Loaded before Settings so both pydantic and the LiveKit SDK see the same values.
load_dotenv(".env.local")

logger = logging.getLogger("freight_negotiator")


def prewarm(proc: JobProcess) -> None:
    """Runs once per worker process, before any call is assigned to it.

    Loading the VAD model here instead of per call removes a few hundred
    milliseconds from the start of every conversation.
    """
    proc.userdata["vad"] = load_vad()


server = AgentServer(setup_fnc=prewarm)


@server.rtc_session()
async def entrypoint(ctx: JobContext) -> None:
    """One call = one job = one AgentSession."""
    settings = load_settings()
    logging.getLogger().setLevel(settings.log_level)

    session = build_session(settings, vad=ctx.proc.userdata["vad"])

    await session.start(
        agent=HelloAgent(),
        room=ctx.room,
        room_options=room_options(),
    )

    # The agent speaks first so the user knows the line is open.
    await session.generate_reply(instructions="Greet the user briefly and ask how you can help.")


if __name__ == "__main__":
    agents.cli.run_app(server)
