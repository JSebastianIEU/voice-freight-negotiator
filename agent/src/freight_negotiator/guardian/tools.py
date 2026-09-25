"""The four functions the LLM may call, as LiveKit tools bound to one call.

The answers come from ``desk.py`` (pure, unit-tested); this module only wraps them for the
framework, logs what the desk decided and publishes the events to the room so the web
client can show them. The docstrings are what the model reads to decide when to call
each tool, so they say *when*, not *how*.
"""

from __future__ import annotations

import logging

from livekit.agents import RunContext, function_tool, llm

from freight_negotiator.guardian.desk import CallState, ToolReply
from freight_negotiator.guardian.events import Publisher

logger = logging.getLogger(__name__)


def guardian_tools(call: CallState, publish: Publisher | None) -> list[llm.Tool]:
    """LiveKit tools bound to one call's state."""

    async def emit(name: str, reply: ToolReply) -> str:
        d = reply.decision
        logger.info(
            "desk %s -> %s",
            name,
            f"{d.action} amount={d.amount}" if d else [e.type for e in reply.events] or "text",
        )
        if publish is not None:
            for event in reply.events:
                await publish(event)
        return reply.text

    @function_tool()
    async def verify_carrier(context: RunContext, mc_number: str, company_name: str = "") -> str:
        """Check the caller in the carrier directory. Call it as soon as the caller gives an MC
        number, passing the digits they said and the company name they gave. Read back the
        company name it returns. No rate may be discussed until this succeeds.
        """
        return await emit("verify_carrier", call.verify(mc_number, company_name))

    @function_tool()
    async def find_loads(
        context: RunContext,
        load_id: str = "",
        origin: str = "",
        destination: str = "",
        equipment: str = "",
    ) -> str:
        """Search the open loads by load number, origin city or state, destination city or
        state, or equipment (dry van, reefer, flatbed). Use it when the caller asks about a
        load other than the one they called about. Returns public details, never a rate.
        """
        return await emit(
            "find_loads",
            call.find(load_id=load_id, origin=origin, destination=destination, equipment=equipment),
        )

    @function_tool()
    async def propose_rate(
        context: RunContext,
        load_id: str = "",
        carrier_ask_usd: int = 0,
        carrier_ask_per_mile: float = 0.0,
    ) -> str:
        """Ask the pricing desk what rate you may quote for a load. Call it every time money
        comes up: when the caller asks what the load pays (leave both amounts at 0), and
        whenever the caller names a figure (their all-in US dollar total in carrier_ask_usd,
        or their per-mile rate in carrier_ask_per_mile). Leave load_id empty for the load you
        are discussing. Quote only the amount the desk returns.
        """
        return await emit(
            "propose_rate",
            call.propose(load_id, carrier_ask_usd, carrier_ask_per_mile),
        )

    @function_tool()
    async def accept_rate(context: RunContext, amount_usd: int, load_id: str = "") -> str:
        """Book the load at amount_usd after the caller agrees to a rate the desk approved.
        This is the only way to close; a deal you did not book here does not exist.
        """
        return await emit("accept_rate", call.accept(amount_usd, load_id))

    return [verify_carrier, find_loads, propose_rate, accept_rate]
