"""The concession policy: how much the agent gives, and when. Decided in code.

Milestone 2 showed that holding the ceiling is not enough: the prompt-only agent never
crossed $2,950 but walked from the floor to the ceiling in three lines whenever the
carrier anchored high, and then announced the ceiling as "the highest I can offer".
A human broker does two things a prompt cannot be trusted to do:

1. **Climb a ladder, not a slope.** Opening offer, one or two steps, target, then one
   best-and-final that is *not* the ceiling. The ceiling is the wall, never the offer.
2. **Only move when the carrier moves.** A carrier who repeats the same number three
   times gets the same answer three times.

``Negotiation`` keeps that state for one load in one call. The LLM never sees the ladder; it asks
"the carrier said X, what do I say?" and gets back one number and one instruction.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from freight_negotiator.guardian.range import Verdict, validate
from freight_negotiator.loads import PriceRange

Action = Literal["open", "accept", "counter", "hold", "final", "booked", "refused"]


@dataclass(frozen=True)
class Decision:
    action: Action
    amount: int | None
    """The one figure the agent may say now; None when there is nothing new to say."""
    ask: Verdict | None = None
    """The carrier's figure this decision answers, if there was one."""

    @property
    def rejected_ask(self) -> bool:
        return self.ask is not None and not self.ask.ok


def build_ladder(
    prices: PriceRange, *, mid_steps: int = 1, final_share: float = 0.5, rounding: int = 25
) -> list[int]:
    """Offers the agent may make, in order: floor, steps to target, one best-and-final.

    ``final_share`` is how much of the target-to-ceiling gap the best-and-final uses;
    0.5 keeps half the safety margin off the table even in the worst case. Everything
    is rounded to ``rounding`` dollars because brokers quote round numbers.
    """
    if not 0 <= final_share < 1:
        raise ValueError("final_share must be in [0, 1): the ceiling is never offered")
    floor, target, ceiling = prices.floor, prices.target, prices.ceiling
    ladder = [floor]
    for i in range(1, mid_steps + 1):
        ladder.append(floor + (target - floor) * i // (mid_steps + 1))
    ladder.append(target)
    ladder.append(target + int((ceiling - target) * final_share))
    rounded = [min(ceiling, (r // rounding) * rounding) for r in ladder]
    # Strictly increasing; a degenerate range (floor == target == ceiling) collapses to one rung.
    out: list[int] = []
    for r in rounded:
        if not out or r > out[-1]:
            out.append(r)
    return out


@dataclass
class Negotiation:
    """State of one load in one call. Created by the call state; never shared across calls."""

    prices: PriceRange
    ladder: list[int] = field(default_factory=list)
    rung: int = -1
    """Index of the current offer in the ladder; -1 before the opening offer."""
    last_ask: int | None = None
    booked: int | None = None
    offered: set[int] = field(default_factory=set)
    """Amounts the policy put on the table or booked: the agent may say these freely."""
    asked: set[int] = field(default_factory=set)
    """Amounts the carrier asked for: the agent may repeat these only to decline them."""
    log: list[Decision] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.ladder:
            self.ladder = build_ladder(self.prices)

    @property
    def cleared(self) -> set[int]:
        """Every amount that went through the guardian, offered or asked."""
        return self.offered | self.asked

    @property
    def current_offer(self) -> int | None:
        return self.ladder[self.rung] if self.rung >= 0 else None

    @property
    def at_final(self) -> bool:
        return self.rung >= len(self.ladder) - 1

    # --- The two questions the tools ask -------------------------------------------

    def respond(self, carrier_ask: object | None) -> Decision:
        """The carrier said ``carrier_ask`` (None: they only asked what it pays)."""
        if self.booked is not None:
            return self._record(Decision("booked", self.booked))
        if carrier_ask is None:
            if self.current_offer is None:
                self.rung = 0
                return self._record(Decision("open", self.current_offer))
            return self._record(Decision("hold", self.current_offer))

        ask = validate(carrier_ask, self.prices)
        if ask.reason == "not_a_rate":
            action: Action = "hold" if self.current_offer is not None else "open"
            if self.current_offer is None:
                self.rung = 0
            return self._record(Decision(action, self.current_offer, ask))
        self.asked.add(ask.amount)

        if self.current_offer is None:
            # Carrier named a number before we opened: an under-ask is a deal, anything
            # else gets the opening offer.
            self.rung = 0
            if ask.ok and ask.amount <= self.current_offer:
                return self._record(Decision("accept", ask.amount, ask))
            return self._record(Decision("open", self.current_offer, ask))

        moved = self.last_ask is None or ask.amount < self.last_ask
        self.last_ask = ask.amount

        if ask.ok and ask.amount <= self.current_offer:
            return self._record(Decision("accept", ask.amount, ask))

        next_rung = self.ladder[self.rung + 1] if not self.at_final else None
        if ask.ok and next_rung is not None and ask.amount <= next_rung and moved:
            # Meeting them costs less than countering with the full step.
            self.rung += 1
            self.ladder[self.rung] = ask.amount
            return self._record(Decision("accept", ask.amount, ask))

        if next_rung is not None and moved:
            self.rung += 1
            action = "final" if self.at_final else "counter"
            return self._record(Decision(action, self.current_offer, ask))

        action = "final" if self.at_final else "hold"
        return self._record(Decision(action, self.current_offer, ask))

    def book(self, amount: object) -> Decision:
        """Close the deal. Only at or under what the policy already put on the table."""
        verdict = validate(amount, self.prices)
        if self.booked is not None:
            return self._record(Decision("booked", self.booked, verdict))
        offer = self.current_offer
        if verdict.ok and offer is not None and verdict.amount <= offer:
            self.booked = verdict.amount
            self.offered.add(verdict.amount)
            return self._record(Decision("booked", verdict.amount, verdict))
        return self._record(Decision("refused", None, verdict))

    def _record(self, d: Decision) -> Decision:
        if d.amount is not None:
            self.offered.add(d.amount)
        self.log.append(d)
        return d
