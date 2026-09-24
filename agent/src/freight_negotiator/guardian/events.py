"""What the guardian tells the outside world.

One JSON object per decision on the LiveKit data channel, topic ``guardian``. The web
client (``web/lib/guardian.ts``) is the consumer: the Core blows open on a rejection and
contracts on an accepted rate. The contract is three event types and one amount; the
reason is short and never contains a bound.
"""

from __future__ import annotations

import json
import time
from collections.abc import Awaitable, Callable
from dataclasses import asdict, dataclass
from typing import Literal

from freight_negotiator.guardian.policy import Decision

GUARDIAN_TOPIC = "guardian"

EventType = Literal["rate.proposed", "rate.rejected", "rate.accepted"]


@dataclass(frozen=True)
class GuardianEvent:
    type: EventType
    amount: int
    reason: str
    ts: float

    def to_json(self) -> str:
        return json.dumps(asdict(self), separators=(",", ":"))


Publisher = Callable[[GuardianEvent], Awaitable[None]]


def events_for(decision: Decision, *, now: float | None = None) -> list[GuardianEvent]:
    """Translate one policy decision into what the screen should show."""
    ts = time.time() if now is None else now
    out: list[GuardianEvent] = []
    if decision.rejected_ask and decision.ask is not None:
        out.append(GuardianEvent("rate.rejected", decision.ask.amount, decision.ask.label, ts))
    if decision.action in ("open", "counter", "final") and decision.amount is not None:
        reason = {"open": "opening offer", "counter": "counter", "final": "best and final"}
        out.append(GuardianEvent("rate.proposed", decision.amount, reason[decision.action], ts))
    elif decision.action in ("accept", "booked") and decision.amount is not None:
        reason = "approved" if decision.action == "accept" else "booked"
        out.append(GuardianEvent("rate.accepted", decision.amount, reason, ts))
    elif decision.action == "refused" and decision.ask is not None:
        if not out:  # a refused booking of an in-range but never-offered amount
            out.append(GuardianEvent("rate.rejected", decision.ask.amount, "never offered", ts))
    return out
