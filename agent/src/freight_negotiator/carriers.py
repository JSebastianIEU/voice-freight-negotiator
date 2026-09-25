"""Carriers: who is allowed to haul a load, checked in code before any money is discussed.

Every US trucking company that hauls for hire needs operating authority from the federal
motor carrier agency (FMCSA), identified by an MC number. A broker checks it before
booking anyone: an inactive or unknown MC is how double brokering and cargo theft start.
In production this lookup is an API call (FMCSA's carrier snapshot); here it is a local
directory built from the catalog, behind the same small interface, so swapping the
source is one class.

Pure data and pure functions, no framework imports, unit-tested offline.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any

from freight_negotiator.loads import read_catalog


@dataclass(frozen=True)
class CarrierRecord:
    carrier_id: str
    company: str
    mc: str  # "884-2210", as printed
    active: bool
    equipment: tuple[str, ...]
    trucks: int
    base: str  # "Joliet, IL"
    contact: str

    def can_haul(self, load_equipment: str) -> bool:
        return compatible(self.equipment, load_equipment)

    @classmethod
    def from_dict(cls, d: Mapping[str, Any]) -> CarrierRecord:
        return cls(
            carrier_id=d["id"],
            company=d["company"],
            mc=d["mc"],
            active=d.get("status", "active") == "active",
            equipment=tuple(d["equipment"]),
            trucks=int(d.get("trucks", 1)),
            base=f"{d['base']['city']}, {d['base']['state']}",
            contact=d.get("driver", ""),
        )


def mc_digits(value: object) -> str:
    """'MC 884-2210', '8842210', 884 2210 -> '8842210'. Anything else -> ''."""
    return re.sub(r"\D", "", str(value or ""))


class CarrierDirectory:
    """Looks carriers up by MC number. Stand-in for the FMCSA API."""

    def __init__(self, records: Iterable[CarrierRecord]):
        self._by_mc = {mc_digits(r.mc): r for r in records}

    def lookup(self, mc: object) -> CarrierRecord | None:
        digits = mc_digits(mc)
        return self._by_mc.get(digits) if digits else None

    def __len__(self) -> int:
        return len(self._by_mc)

    @classmethod
    def from_catalog(cls, catalog: Mapping[str, Any] | None = None) -> CarrierDirectory:
        data = catalog if catalog is not None else read_catalog()
        return cls(CarrierRecord.from_dict(d) for d in data["carriers"])


DIRECTORY = CarrierDirectory.from_catalog()


# --- Equipment ---------------------------------------------------------------------


def equipment_kind(equipment: str) -> str:
    e = equipment.lower()
    if "reefer" in e or "refrigerat" in e:
        return "reefer"
    if "flat" in e:
        return "flatbed"
    if "van" in e:
        return "dry van"
    return e.strip()


def compatible(carrier_equipment: Iterable[str], load_equipment: str) -> bool:
    """Same kind of trailer, or a reefer running dry: common practice for van freight."""
    need = equipment_kind(load_equipment)
    have = {equipment_kind(e) for e in carrier_equipment}
    return need in have or (need == "dry van" and "reefer" in have)


# --- Names -------------------------------------------------------------------------

GENERIC = {
    "transport",
    "transportation",
    "logistics",
    "carrier",
    "carriers",
    "trucking",
    "truck",
    "trucks",
    "freight",
    "hauling",
    "lines",
    "line",
    "inc",
    "llc",
    "co",
    "company",
    "corp",
    "express",
    "the",
    "and",
    "refrigerated",
    "flatbed",
}


def _tokens(s: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", s.lower())


def names_match(given: str, registered: str) -> bool:
    """Does the name the caller gave belong to the registered company?

    Lenient on purpose: speech-to-text writes 'Red Line' for 'Redline', callers drop
    'Transport' or 'LLC'. Strict on the part that identifies a company: at least one
    distinctive word must match. An empty name cannot contradict anything.
    """
    g = _tokens(given)
    if not g:
        return True
    r = _tokens(registered)
    sig_r = [t for t in r if t not in GENERIC] or r
    sig_g = [t for t in g if t not in GENERIC]
    if not sig_g:
        return False  # "Transport" alone identifies nobody; ask again

    compact_g, compact_r = "".join(g), "".join(r)
    if any(t in sig_g or t in compact_g for t in sig_r):
        return True
    return any(len(t) >= 4 and t in compact_r for t in sig_g)
