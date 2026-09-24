"""Loads: what the broker is trying to cover, and the money on each one.

A load is the unit of work in freight brokerage: one shipment, one lane, one truck.
The three prices on it (floor, target, ceiling) are the broker's private numbers; the
carrier never sees them. See docs/domain.md for what each one means.

This module is plain data with no framework imports, so the guardian and the tests
can use it without LiveKit.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, time


@dataclass(frozen=True)
class PriceRange:
    """The broker's numbers for one load, in whole US dollars, all-in.

    floor   -- opening offer; below it the carrier hangs up, so it is never offered.
    target  -- where the broker wants to close.
    ceiling -- the most the broker can pay and keep its minimum margin; never exceeded.
    """

    floor: int
    target: int
    ceiling: int

    def __post_init__(self) -> None:
        if not (0 < self.floor <= self.target <= self.ceiling):
            raise ValueError(
                f"expected 0 < floor <= target <= ceiling, got {self.floor}, {self.target}, "
                f"{self.ceiling}"
            )

    def contains(self, amount: int) -> bool:
        return self.floor <= amount <= self.ceiling


@dataclass(frozen=True)
class Stop:
    city: str
    state: str
    on: date
    window_start: time
    window_end: time

    @property
    def place(self) -> str:
        return f"{self.city}, {self.state}"

    def describe(self) -> str:
        """Speech-friendly: 'Chicago, Illinois on Thursday the 25th between 8 and 2 pm'."""
        return (
            f"{self.city}, {STATE_NAMES.get(self.state, self.state)} on "
            f"{self.on.strftime('%A the %d').replace(' 0', ' ')}, "
            f"between {_speak_time(self.window_start)} and {_speak_time(self.window_end)}"
        )


@dataclass(frozen=True)
class Load:
    load_id: str
    origin: Stop
    destination: Stop
    equipment: str  # "53' dry van", "53' reefer", "48' flatbed"
    commodity: str
    weight_lbs: int
    miles: int
    notes: str
    sell_rate: int  # what the shipper pays the broker; context only, never spoken
    prices: PriceRange

    @property
    def lane(self) -> str:
        return f"{self.origin.place} to {self.destination.place}"

    def brief(self) -> str:
        """The load as a broker rep would read it to a carrier. No prices here."""
        return (
            f"Load {self.load_id}: {self.lane}, {self.miles} miles. "
            f"{self.equipment}, {self.commodity}, {self.weight_lbs:,} pounds. "
            f"Picks up in {self.origin.describe()}; delivers in {self.destination.describe()}. "
            f"{self.notes}"
        )


STATE_NAMES = {"IL": "Illinois", "TX": "Texas"}


def _speak_time(t: time) -> str:
    hour = t.hour % 12 or 12
    suffix = "am" if t.hour < 12 else "pm"
    return f"{hour} {suffix}" if t.minute == 0 else f"{hour}:{t.minute:02d} {suffix}"


# One realistic lane. Chicago -> Dallas is a workhorse dry-van lane; ~925 practical miles.
# Sell $3,300, ceiling $2,950 keeps a little over 10 % margin, target $2,700, floor $2,450.
SAMPLE_LOAD = Load(
    load_id="CHI-DAL-4471",
    origin=Stop("Chicago", "IL", date(2026, 9, 25), time(8, 0), time(14, 0)),
    destination=Stop("Dallas", "TX", date(2026, 9, 27), time(6, 0), time(12, 0)),
    equipment="53' dry van",
    commodity="palletized consumer goods, no hazmat",
    weight_lbs=42_000,
    miles=925,
    notes="Drop trailer not required, live load and live unload, no touch freight.",
    sell_rate=3_300,
    prices=PriceRange(floor=2_450, target=2_700, ceiling=2_950),
)
