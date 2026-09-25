"""The five functions the LLM may call, as LiveKit tools bound to one call.

The answers come from ``desk.py`` (pure, unit-tested); this module only wraps them for the
framework, logs what the desk decided and publishes the events to the room so the web
client can show them. The docstrings are what the model reads to decide when to call
each tool, so they say *when*, not *how*.
"""

from __future__ import annotations

import contextlib
import logging

from livekit import api
from livekit.agents import RunContext, function_tool, get_job_context, llm

from freight_negotiator.guardian.desk import CallState, ToolReply
from freight_negotiator.guardian.events import Publisher, call_ended_event

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
        extras_usd: int = 0,
        surcharge_percent: float = 0.0,
        currency: str = "USD",
    ) -> str:
        """Ask the pricing desk what rate you may quote for a load. Call it every time money
        comes up: when the caller asks what the load pays (leave the amounts at 0), and
        whenever the caller names a figure. Pass exactly what they said, and do no math:
        their base figure in carrier_ask_usd (or a per-mile rate in carrier_ask_per_mile),
        every dollar add-on they stack on top (deadhead, fuel, detention, lumper) summed in
        extras_usd, any percentage on top in surcharge_percent, and the currency they named
        in currency. The desk adds it all up and judges the total. Leave load_id empty for
        the load you are discussing. Quote only the amount the desk returns.
        """
        return await emit(
            "propose_rate",
            call.propose(
                load_id,
                carrier_ask_usd,
                carrier_ask_per_mile,
                extras_usd=extras_usd,
                surcharge_percent=surcharge_percent,
                currency=currency,
            ),
        )

    @function_tool()
    async def accept_rate(context: RunContext, amount_usd: int, load_id: str = "") -> str:
        """Book the load at amount_usd after the caller agrees to a rate the desk approved.
        This is the only way to close; a deal you did not book here does not exist.
        """
        return await emit("accept_rate", call.accept(amount_usd, load_id))

    @function_tool()
    async def end_call(context: RunContext, reason: str = "done") -> str:
        """Hang up. Call it only after your closing line, once the caller has nothing else:
        when the load is booked and the details are exchanged, when the caller says goodbye
        or wants to hang up, when the desk told you to end the call, or when there is no
        deal. reason is one of: booked, no deal, not verified, caller left.
        """
        logger.info("desk end_call -> %s", reason)
        if publish is not None:
            await publish(call_ended_event(reason))
        # Let the goodbye finish playing, then close the room; the browser sees the
        # disconnect and shows the result.
        with contextlib.suppress(Exception):  # nothing to wait for in text mode
            await context.speech_handle.wait_for_playout()
        job = get_job_context(required=False)
        if job is not None:
            await job.api.room.delete_room(api.DeleteRoomRequest(room=job.room.name))
        return "The call is over. Say nothing more."

    return [verify_carrier, find_loads, propose_rate, accept_rate, end_call]
