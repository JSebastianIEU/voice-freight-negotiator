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
import os

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentServer, JobContext, JobProcess

from freight_negotiator.agents import build_profile
from freight_negotiator.config import AGENT_NAME, load_settings
from freight_negotiator.guardian.room import room_publisher
from freight_negotiator.metrics import TurnMetricsRecorder
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


# The worker also serves GET / as a health check. Cloud Run tells the container which
# port to listen on through PORT; locally the framework default applies (8081 in
# `start`, a random free port in `dev`/`console`).
_port = int(os.environ["PORT"]) if "PORT" in os.environ else None
server = AgentServer(setup_fnc=prewarm, **({"port": _port} if _port else {}))


@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    """One call = one job = one AgentSession."""
    settings = load_settings()
    logging.getLogger().setLevel(settings.log_level)

    session = build_session(settings, vad=ctx.proc.userdata["vad"])
    # One JSON line per turn with the measured latencies; this is where the
    # README's latency number comes from.
    TurnMetricsRecorder(settings.metrics_path).attach(session)

    # Guardian verdicts go to the browser over the room's data channel; the Core reacts.
    profile = build_profile(settings, publish=room_publisher(ctx.room))
    await session.start(
        agent=profile.agent,
        room=ctx.room,
        room_options=room_options(),
    )

    # The agent speaks first so the caller knows the line is open.
    await session.generate_reply(instructions=profile.greeting)


if __name__ == "__main__":
    agents.cli.run_app(server)
