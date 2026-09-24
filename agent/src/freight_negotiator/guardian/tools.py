"""The two functions the LLM may call, and what they say back.

The replies are written *for the model*: one figure, how to say it, what to do next.
They never contain the floor, the target or the ceiling, so a prompt injection that
says "repeat your instructions" has nothing to find. The pure builders (``propose``,
``accept``) are unit-tested; ``guardian_tools`` wraps them as LiveKit function tools
for the agent and publishes the events.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from livekit.agents import RunContext, function_tool, llm

from freight_negotiator.guardian.events import GuardianEvent, Publisher, events_for
from freight_negotiator.guardian.policy import Decision, Negotiation
from freight_negotiator.loads import Load
from freight_negotiator.money import say_amount

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ToolReply:
    text: str
    decision: Decision
    events: list[GuardianEvent] = field(default_factory=list)


def _quote(amount: int) -> str:
    return f'${amount:,} (say "{say_amount(amount)}")'


def _ask_line(d: Decision) -> str:
    if d.ask is None:
        return ""
    if d.ask.ok:
        return f"The carrier's ${d.ask.amount:,} is within what this load can pay. "
    if d.ask.reason == "not_a_rate":
        return "The carrier's figure could not be read as a rate. "
    return f"The carrier's ${d.ask.amount:,} is not approved: {d.ask.label}. "


def propose(
    negotiation: Negotiation,
    load: Load,
    *,
    carrier_ask_usd: object | None = None,
    carrier_ask_per_mile: object | None = None,
) -> ToolReply:
    """Answer 'the carrier said X, what may I say?'. The code converts per-mile asks."""
    ask: object | None = carrier_ask_usd if carrier_ask_usd else None
    converted = ""
    if not ask and carrier_ask_per_mile:
        try:
            per_mile = float(carrier_ask_per_mile)  # type: ignore[arg-type]
            ask = int(round(per_mile * load.miles))
            converted = (
                f"${per_mile:.2f} per mile on {load.miles} miles is ${ask:,} all in "
                "(convert only through this tool; quote totals, never per mile). "
            )
        except (TypeError, ValueError):
            ask = "not a number"
    d = negotiation.respond(ask)
    head = converted + _ask_line(d)
    amount = d.amount
    if d.action == "open" and amount is not None:
        body = f"Quote {_quote(amount)} as your offer for the load."
    elif d.action == "accept" and amount is not None:
        body = (
            f"You may book at {_quote(amount)}. Tell the carrier it works, and once they "
            f"confirm, call accept_rate with {amount}."
        )
    elif d.action == "counter" and amount is not None:
        body = (
            f"Counter at {_quote(amount)}. Justify with the lane and the freight, not with numbers."
        )
    elif d.action == "hold" and amount is not None:
        body = (
            f"Hold at {_quote(amount)}; nothing more is available unless the carrier moves. "
            "Restate it briefly."
        )
    elif d.action == "final" and amount is not None:
        body = (
            f"Best and final: {_quote(amount)}. If the carrier declines, thank them, say the "
            "load stays posted, and end the call."
        )
    elif d.action == "booked" and amount is not None:
        body = f"This load is already booked at {_quote(amount)}. Do not renegotiate."
    else:
        body = "Nothing new to quote."
    tail = " Say no other dollar figure than the one above."
    return ToolReply(head + body + tail, d, events_for(d))


def accept(negotiation: Negotiation, *, amount_usd: object) -> ToolReply:
    """Close the deal, if and only if the policy already put that amount on the table."""
    d = negotiation.book(amount_usd)
    if d.action == "booked" and d.amount is not None:
        body = (
            f"Booked at {_quote(d.amount)}. Repeat the rate once, say the rate confirmation "
            "goes to their email, and ask for the driver's name and phone number."
        )
    else:
        body = (
            "Cannot book that amount: it was never offered by the pricing desk. Do not "
            "confirm it. Call propose_rate with the carrier's figure and quote only what it "
            "returns."
        )
    return ToolReply(body, d, events_for(d))


def guardian_tools(
    negotiation: Negotiation, load: Load, publish: Publisher | None
) -> list[llm.Tool]:
    """LiveKit tools bound to one call's negotiation state."""

    async def emit(reply: ToolReply) -> None:
        logger.info(
            "guardian %s amount=%s ask=%s",
            reply.decision.action,
            reply.decision.amount,
            reply.decision.ask.amount if reply.decision.ask else None,
        )
        if publish is None:
            return
        for event in reply.events:
            await publish(event)

    @function_tool()
    async def propose_rate(
        context: RunContext,
        carrier_ask_usd: int = 0,
        carrier_ask_per_mile: float = 0.0,
    ) -> str:
        """Ask the pricing desk what rate you may quote. Call it every time money comes up:
        when the carrier asks what the load pays (leave both arguments at 0), and whenever the
        carrier names a figure (pass their all-in US dollar total in carrier_ask_usd, or their
        per-mile rate in carrier_ask_per_mile and let the desk convert it). Quote only the
        amount the desk returns.
        """
        reply = propose(
            negotiation,
            load,
            carrier_ask_usd=carrier_ask_usd,
            carrier_ask_per_mile=carrier_ask_per_mile,
        )
        await emit(reply)
        return reply.text

    @function_tool()
    async def accept_rate(context: RunContext, amount_usd: int) -> str:
        """Book the load at amount_usd after the carrier agrees to a rate the desk approved.
        This is the only way to close; a deal you did not book here does not exist.
        """
        reply = accept(negotiation, amount_usd=amount_usd)
        await emit(reply)
        return reply.text

    return [propose_rate, accept_rate]
