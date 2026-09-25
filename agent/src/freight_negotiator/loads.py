"""Loads: what the broker is trying to cover, and the money on each one.

A load is the unit of work in freight brokerage: one shipment, one lane, one truck.
The three prices on it (floor, target, ceiling) are the broker's private numbers; the
carrier never sees them. See docs/domain.md for what each one means.

The catalog (``data/catalog.json``) is the single source for the load board, the carrier
personas and the broker's numbers. The web client ships a copy (``web/data/catalog.json``);
``make sync-catalog`` refreshes it and a test fails when the two drift apart.

This module is plain data with no framework imports, so the guardian and the tests
can use it without LiveKit.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, time
from pathlib import Path
from typing import Any

CATALOG_PATH = Path(__file__).resolve().parent / "data" / "catalog.json"


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

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Stop:
        start, end = d["window"]
        return cls(
            city=d["city"],
            state=d["state"],
            on=date.fromisoformat(d["date"]),
            window_start=time.fromisoformat(start),
            window_end=time.fromisoformat(end),
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

    @property
    def spoken_lane(self) -> str:
        """'Chicago to Dallas', the way a rep names a load on the phone."""
        return f"{self.origin.city} to {self.destination.city}"

    def brief(self) -> str:
        """The load as a broker rep would read it to a carrier. No prices here."""
        return (
            f"Load {self.load_id}: {self.lane}, {self.miles} miles. "
            f"{self.equipment}, {self.commodity}, {self.weight_lbs:,} pounds. "
            f"Picks up in {self.origin.describe()}; delivers in {self.destination.describe()}. "
            f"{self.notes}"
        )

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Load:
        # The agent speaks English; the Spanish texts in the catalog are for the web client.
        return cls(
            load_id=d["id"],
            origin=Stop.from_dict(d["origin"]),
            destination=Stop.from_dict(d["destination"]),
            equipment=d["equipment"],
            commodity=d["commodity"]["en"],
            weight_lbs=int(d["weight_lbs"]),
            miles=int(d["miles"]),
            notes=d["notes"]["en"],
            sell_rate=int(d["sell_rate"]),
            prices=PriceRange(**{k: int(v) for k, v in d["prices"].items()}),
        )


STATE_NAMES = {
    "AZ": "Arizona",
    "CA": "California",
    "CO": "Colorado",
    "GA": "Georgia",
    "IL": "Illinois",
    "NC": "North Carolina",
    "NJ": "New Jersey",
    "TN": "Tennessee",
    "TX": "Texas",
}


def _speak_time(t: time) -> str:
    hour = t.hour % 12 or 12
    suffix = "am" if t.hour < 12 else "pm"
    return f"{hour} {suffix}" if t.minute == 0 else f"{hour}:{t.minute:02d} {suffix}"


def read_catalog(path: Path = CATALOG_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, Load]:
    """Every load in the catalog, by id, in board order."""
    return {d["id"]: Load.from_dict(d) for d in read_catalog(path)["loads"]}


CATALOG: dict[str, Load] = load_catalog()

# The lane used by the tests, the attack catalog and the README numbers. Chicago -> Dallas is
# a workhorse dry-van lane; sell $3,300, ceiling $2,950 keeps a little over 10 % margin.
SAMPLE_LOAD: Load = CATALOG["CHI-DAL-4471"]


def find_load(load_id: str | None) -> Load:
    """The load a call is about; unknown or missing ids fall back to the sample lane."""
    if load_id and load_id in CATALOG:
        return CATALOG[load_id]
    return SAMPLE_LOAD
