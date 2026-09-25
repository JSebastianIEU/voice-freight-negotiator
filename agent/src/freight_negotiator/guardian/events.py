"""What the guardian tells the outside world.

One JSON object per decision on the LiveKit data channel, topic ``guardian``. The web
client (``web/lib/guardian.ts``) is the consumer: the Core blows open on a rejection,
contracts on an accepted rate and scans when a carrier is verified. The contract:

- ``rate.proposed`` / ``rate.rejected`` / ``rate.accepted``: ``amount``, ``reason``,
  ``loadId``; the reason is short and never contains a bound.
- ``carrier.verified`` / ``carrier.rejected``: ``mc``, ``company`` (when known), ``reason``.
- ``load.focus``: ``loadId``, when the conversation moves to another posting.
"""

from __future__ import annotations

import json
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Literal

from freight_negotiator.guardian.policy import Decision

GUARDIAN_TOPIC = "guardian"

EventType = Literal[
    "rate.proposed",
    "rate.rejected",
    "rate.accepted",
    "carrier.verified",
    "carrier.rejected",
    "load.focus",
]


@dataclass(frozen=True)
class GuardianEvent:
    type: EventType
    amount: int = 0
    reason: str = ""
    ts: float = 0.0
    load_id: str | None = None
    company: str | None = None
    mc: str | None = None

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"type": self.type, "ts": self.ts}
        if self.type.startswith("rate."):
            d["amount"] = self.amount
        if self.reason:
            d["reason"] = self.reason
        if self.load_id:
            d["loadId"] = self.load_id
        if self.company:
            d["company"] = self.company
        if self.mc:
            d["mc"] = self.mc
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), separators=(",", ":"))


Publisher = Callable[[GuardianEvent], Awaitable[None]]


def events_for(
    decision: Decision, *, now: float | None = None, load_id: str | None = None
) -> list[GuardianEvent]:
    """Translate one policy decision into what the screen should show."""
    ts = time.time() if now is None else now

    def ev(type_: EventType, amount: int, reason: str) -> GuardianEvent:
        return GuardianEvent(type_, amount, reason, ts, load_id=load_id)

    out: list[GuardianEvent] = []
    if decision.rejected_ask and decision.ask is not None:
        out.append(ev("rate.rejected", decision.ask.amount, decision.ask.label))
    if decision.action in ("open", "counter", "final") and decision.amount is not None:
        reason = {"open": "opening offer", "counter": "counter", "final": "best and final"}
        out.append(ev("rate.proposed", decision.amount, reason[decision.action]))
    elif decision.action in ("accept", "booked") and decision.amount is not None:
        out.append(
            ev(
                "rate.accepted",
                decision.amount,
                "approved" if decision.action == "accept" else "booked",
            )
        )
    elif decision.action == "refused" and decision.ask is not None:
        if not out:  # a refused booking of an in-range but never-offered amount
            out.append(ev("rate.rejected", decision.ask.amount, "never offered"))
    return out


def carrier_event(
    verified: bool,
    *,
    mc: str,
    company: str | None = None,
    reason: str = "",
    now: float | None = None,
) -> GuardianEvent:
    return GuardianEvent(
        "carrier.verified" if verified else "carrier.rejected",
        reason=reason,
        ts=time.time() if now is None else now,
        company=company,
        mc=mc,
    )


def focus_event(load_id: str, *, now: float | None = None) -> GuardianEvent:
    return GuardianEvent("load.focus", ts=time.time() if now is None else now, load_id=load_id)
