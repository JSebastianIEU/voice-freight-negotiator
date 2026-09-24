"""May this amount be paid? One function, one answer, no prompt involved.

The ceiling is the only hard wall: above it the broker loses money on the load. Below
the floor is not a problem for the broker (the carrier is asking for less than the
opening offer), so it is valid; whether the agent *offers* below the floor is a policy
question (policy.py), not a validity one.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from freight_negotiator.loads import PriceRange
from freight_negotiator.money import MAX_AMOUNT

Reason = Literal["ok", "above_ceiling", "not_a_rate"]


@dataclass(frozen=True)
class Verdict:
    amount: int
    ok: bool
    reason: Reason

    @property
    def label(self) -> str:
        """Short, speech-free text for events and logs. Never mentions the bounds."""
        return {
            "ok": "approved",
            "above_ceiling": "above what this load can pay",
            "not_a_rate": "not a usable rate",
        }[self.reason]


def validate(amount: object, prices: PriceRange) -> Verdict:
    """Pure: the same input always gives the same verdict, whatever the caller said.

    Accepts anything the LLM might pass (float, numeric string) and normalises it to
    whole dollars; garbage is a ``not_a_rate`` verdict, never an exception in the call.
    """
    try:
        value = int(round(float(amount)))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return Verdict(0, False, "not_a_rate")
    if value <= 0 or value > MAX_AMOUNT:
        return Verdict(value, False, "not_a_rate")
    if value > prices.ceiling:
        return Verdict(value, False, "above_ceiling")
    return Verdict(value, True, "ok")
