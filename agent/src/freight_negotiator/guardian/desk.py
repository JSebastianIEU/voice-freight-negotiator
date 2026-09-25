"""The pricing desk: everything the model may ask during a call, answered by code.

Four questions, four tools (``tools.py`` wraps them for LiveKit):

- **verify_carrier**: who is calling? The MC number is looked up in the carrier directory
  (``carriers.py``); only an active carrier whose name matches is verified.
- **find_loads**: what else is on the board? Public details only, never a rate.
- **propose_rate**: the carrier said X, what may I say? Answered by the concession policy
  (``policy.py``), one negotiation per load.
- **accept_rate**: book it. Only at or under what the desk already offered.

Three rules live here, in code, and the prompt only repeats them:

1. No rate is quoted, discussed or booked before the carrier is verified.
2. No rate is quoted or booked on a load the carrier's equipment cannot haul.
3. The replies never contain a floor, target or ceiling of any load.

``CallState`` holds one call. Its replies are written for the model: what happened, what
to say, what to do next. Everything here is pure and unit-tested offline.
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass, field

from freight_negotiator.carriers import (
    CarrierDirectory,
    CarrierRecord,
    equipment_kind,
    mc_digits,
    names_match,
)
from freight_negotiator.guardian.events import (
    GuardianEvent,
    carrier_event,
    events_for,
    focus_event,
)
from freight_negotiator.guardian.policy import Decision, Negotiation
from freight_negotiator.guardian.range import validate
from freight_negotiator.loads import STATE_NAMES, Load
from freight_negotiator.money import say_amount


@dataclass(frozen=True)
class ToolReply:
    text: str
    events: list[GuardianEvent] = field(default_factory=list)
    decision: Decision | None = None


# --- One negotiation: the answers of milestone 3 -----------------------------------


def _quote(amount: int) -> str:
    return f'${amount:,} (say "{say_amount(amount)}")'


def _ask_line(d: Decision) -> str:
    """What the desk says about the carrier's figure. Only yes or no: an ask that the load
    could afford but the ladder does not reach reads exactly like one above the ceiling, so
    repeated asks cannot map where the ceiling is."""
    if d.ask is None:
        return ""
    if d.ask.reason == "not_a_rate":
        return "The carrier's figure could not be read as a rate. "
    if d.action == "accept":
        return ""
    return f"The carrier's ${d.ask.amount:,} is not approved. "


def per_mile_total(load: Load, per_mile: object) -> int | None:
    try:
        value = float(per_mile)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if not value or value != value:  # zero or NaN
        return None
    return int(round(value * load.miles))


def _number(value: object) -> float | None:
    try:
        v = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return None if v != v else v  # NaN


def propose(
    negotiation: Negotiation,
    load: Load,
    *,
    carrier_ask_usd: object | None = None,
    carrier_ask_per_mile: object | None = None,
    extras_usd: object | None = None,
    surcharge_percent: object | None = None,
) -> ToolReply:
    """Answer 'the carrier said X, what may I say?'. The code does all the arithmetic:
    per mile to all in, and every add-on the carrier stacks on top (deadhead, fuel, a
    percentage), so the desk judges the total the carrier would be paid, not one part."""
    ask: object | None = carrier_ask_usd if carrier_ask_usd else None
    converted = ""
    if not ask and carrier_ask_per_mile:
        total = per_mile_total(load, carrier_ask_per_mile)
        if total is None:
            ask = "not a number"
        else:
            ask = total
            converted = (
                f"${float(carrier_ask_per_mile):.2f} per mile on {load.miles} miles is "  # type: ignore[arg-type]
                f"${total:,} all in (convert only through this tool; quote totals, never per "
                "mile). "
            )
    extras = _number(extras_usd) or 0.0
    percent = _number(surcharge_percent) or 0.0
    if (extras or percent) and not isinstance(ask, str):
        # "Your max plus ten percent": with no base figure, the add-on sits on our offer.
        base = _number(ask) if ask else negotiation.current_offer or negotiation.ladder[0]
        if base is not None:
            total = int(round(base + extras + base * percent / 100))
            parts = [f"${int(round(base)):,}"]
            if extras:
                parts.append(f"${int(round(extras)):,} in extras")
            if percent:
                parts.append(f"{percent:g}% on top")
            converted += (
                f"{' plus '.join(parts)} is ${total:,} all in; the desk judges that total, "
                "never a part of it. "
            )
            ask = total
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
    return ToolReply(head + body + tail, events_for(d, load_id=load.load_id), d)


def accept(
    negotiation: Negotiation, *, amount_usd: object, load_id: str | None = None
) -> ToolReply:
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
    return ToolReply(body, events_for(d, load_id=load_id), d)


# --- The call ----------------------------------------------------------------------


def _norm_id(value: object) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def _place_matches(query: str, city: str, state: str) -> bool:
    q = query.strip().lower()
    if not q:
        return True
    names = {city.lower(), state.lower(), STATE_NAMES.get(state, state).lower()}
    return any(q in n or n in q for n in names)


_USD = {"", "usd", "us", "us dollars", "us dollar", "dollars", "dollar", "$", "us$", "usd$"}


def _is_usd(currency: object) -> bool:
    return str(currency or "").strip().lower().replace(".", "") in _USD


@dataclass
class CallState:
    """One phone call: who is calling, which loads came up, one negotiation per load."""

    posted: Load
    """The posting the caller clicked on the board; the call starts about it."""
    loads: Mapping[str, Load]
    directory: CarrierDirectory
    carrier: CarrierRecord | None = None
    negotiations: dict[str, Negotiation] = field(default_factory=dict)
    focus: str = ""
    failed_checks: int = 0
    heard: set[int] = field(default_factory=set)
    """Amounts the caller named before being verified; repeatable only to decline them."""

    def __post_init__(self) -> None:
        if not self.focus:
            self.focus = self.posted.load_id

    # -- lookups --------------------------------------------------------------------

    def negotiation(self, load_id: str) -> Negotiation:
        if load_id not in self.negotiations:
            self.negotiations[load_id] = Negotiation(self.loads[load_id].prices)
        return self.negotiations[load_id]

    def find_load(self, load_id: object) -> Load | None:
        """'CHI-DAL-4471', 'chi dal 4471', '4471' -> the load, or None."""
        key = _norm_id(load_id)
        if not key:
            return None
        for lid, load in self.loads.items():
            if _norm_id(lid) == key:
                return load
        digits = re.sub(r"\D", "", key)
        hits = [ld for lid, ld in self.loads.items() if digits and lid.endswith(digits)]
        return hits[0] if len(hits) == 1 else None

    def _target(self, load_id: object) -> Load | None:
        if not str(load_id or "").strip():
            return self.loads.get(self.focus, self.posted)
        return self.find_load(load_id)

    def speakable(self) -> set[int]:
        out: set[int] = set()
        for n in self.negotiations.values():
            out |= n.offered
        return out

    def declinable(self) -> set[int]:
        out = set(self.heard)
        for n in self.negotiations.values():
            out |= n.asked
        return out

    # -- verify_carrier -------------------------------------------------------------

    def verify(self, mc_number: object, company_name: object = "") -> ToolReply:
        digits = mc_digits(mc_number)
        name = str(company_name or "").strip()
        if not digits:
            return ToolReply("No MC number was given. Ask the caller for their MC number.")
        printed = f"{digits[:3]}-{digits[3:]}" if len(digits) == 7 else digits
        rec = self.directory.lookup(digits)

        if rec is None:
            self.failed_checks += 1
            ev = carrier_event(False, mc=printed, reason="not found")
            if self.failed_checks >= 2:
                return ToolReply(
                    f"MC {printed} is not in the carrier directory either. You cannot work "
                    "with an unverified carrier. Say so politely, suggest they call back "
                    "with their authority details, and end the call. Do not discuss rates.",
                    [ev],
                )
            return ToolReply(
                f"No carrier with MC {printed} in the directory. Ask the caller to repeat the "
                "MC number digit by digit. Do not discuss rates until it checks out.",
                [ev],
            )

        if not rec.active:
            self.failed_checks += 1
            return ToolReply(
                f"MC {rec.mc} is registered to {rec.company}, and its operating authority is "
                "not active. You cannot book an inactive carrier. Tell the caller politely "
                "that you can't work with them until their authority is active, and end the "
                "call. Do not discuss rates.",
                [carrier_event(False, mc=rec.mc, company=rec.company, reason="authority inactive")],
            )

        if name and not names_match(name, rec.company):
            self.failed_checks += 1
            return ToolReply(
                f"MC {rec.mc} is registered to {rec.company}, not to '{name}'. Ask the caller "
                f"to confirm the company name. Only if they confirm {rec.company}, call "
                "verify_carrier again with that name. Do not discuss rates until it matches.",
                [carrier_event(False, mc=rec.mc, company=rec.company, reason="name mismatch")],
            )

        self.carrier = rec
        load = self.loads.get(self.focus, self.posted)
        if rec.can_haul(load.equipment):
            fit = f"Their equipment can haul load {load.load_id} ({load.equipment})."
        else:
            fit = (
                f"Their equipment cannot haul load {load.load_id} ({load.equipment}). Tell "
                f"them, and offer to look for a {rec.equipment[0]} load with find_loads."
            )
        return ToolReply(
            f"Verified: {rec.company}, MC {rec.mc}, operating authority active, "
            f"{rec.trucks} trucks, equipment on file: {', '.join(rec.equipment)}, based in "
            f"{rec.base}, contact {rec.contact}. Read the company name back to the caller to "
            f"confirm it is them. {fit}",
            [carrier_event(True, mc=rec.mc, company=rec.company)],
        )

    # -- find_loads -----------------------------------------------------------------

    def find(
        self,
        *,
        load_id: object = "",
        origin: object = "",
        destination: object = "",
        equipment: object = "",
    ) -> ToolReply:
        if str(load_id or "").strip():
            one = self.find_load(load_id)
            matches = [one] if one else []
        else:
            o, d, e = (str(x or "") for x in (origin, destination, equipment))
            matches = [
                ld
                for ld in self.loads.values()
                if _place_matches(o, ld.origin.city, ld.origin.state)
                and _place_matches(d, ld.destination.city, ld.destination.state)
                and (not e.strip() or equipment_kind(e) == equipment_kind(ld.equipment))
            ]
        if self.carrier is not None:
            matches.sort(key=lambda ld: not self.carrier.can_haul(ld.equipment))  # type: ignore[union-attr]
        if not matches:
            lanes = "; ".join(f"{ld.load_id} {ld.spoken_lane}" for ld in self.loads.values())
            return ToolReply(
                f"No open load matches. The open loads are: {lanes}. Offer the closest one."
            )
        events: list[GuardianEvent] = []
        if len(matches) == 1 and matches[0].load_id != self.focus:
            self.focus = matches[0].load_id
            events.append(focus_event(self.focus))
        briefs = " ".join(ld.brief() for ld in matches[:3])
        more = f" ({len(matches) - 3} more)" if len(matches) > 3 else ""
        return ToolReply(
            f"{briefs}{more} Rates are negotiated on the phone: when the caller asks what it "
            "pays, call propose_rate with the load number.",
            events,
        )

    # -- propose_rate / accept_rate -------------------------------------------------

    def _gate(self, load: Load | None, load_id: object) -> str | None:
        """Why no money may be discussed yet, or None."""
        if load is None:
            return (
                f"There is no open load '{load_id}'. Use find_loads to find the one the "
                "caller means."
            )
        if self.carrier is None:
            return (
                "Not yet: the caller is not verified. Ask for their MC number and company "
                "name and call verify_carrier. Do not say any rate, and do not agree to "
                "theirs, until that succeeds."
            )
        if not self.carrier.can_haul(load.equipment):
            return (
                f"{self.carrier.company} has {', '.join(self.carrier.equipment)} on file, which "
                f"cannot haul load {load.load_id} ({load.equipment}). Do not quote it. Offer to "
                f"look for a {self.carrier.equipment[0]} load with find_loads."
            )
        return None

    def _remember_ask(
        self, load: Load | None, usd: object, per_mile: object, extras: object = None
    ) -> None:
        extra = _number(extras) or 0.0
        if usd and extra and _number(usd) is not None:
            usd = _number(usd) + extra  # type: ignore[operator]
        verdict = validate(usd, load.prices) if load and usd else None
        if verdict is not None and verdict.reason != "not_a_rate":
            self.heard.add(verdict.amount)
        elif load is not None and per_mile:
            total = per_mile_total(load, per_mile)
            if total:
                self.heard.add(total)

    def propose(
        self,
        load_id: object = "",
        carrier_ask_usd: object | None = None,
        carrier_ask_per_mile: object | None = None,
        extras_usd: object | None = None,
        surcharge_percent: object | None = None,
        currency: object = "USD",
    ) -> ToolReply:
        load = self._target(load_id)
        blocked = self._gate(load, load_id)
        if blocked:
            self._remember_ask(load, carrier_ask_usd, carrier_ask_per_mile, extras_usd)
            return ToolReply(blocked)
        assert load is not None
        if not _is_usd(currency) and (carrier_ask_usd or carrier_ask_per_mile):
            # No exchange rate is ever applied, the carrier's least of all.
            return ToolReply(
                f"Load {load.load_id}: the desk only prices in US dollars and never converts "
                f"a figure given in {str(currency).strip()}. Tell the carrier you pay in US "
                "dollars only and ask for their all-in figure in US dollars. Do not convert "
                "it yourself, do not accept their conversion, and agree to nothing until they "
                "give a US dollar figure."
            )
        events: list[GuardianEvent] = []
        if load.load_id != self.focus:
            self.focus = load.load_id
            events.append(focus_event(load.load_id))
        reply = propose(
            self.negotiation(load.load_id),
            load,
            carrier_ask_usd=carrier_ask_usd,
            carrier_ask_per_mile=carrier_ask_per_mile,
            extras_usd=extras_usd,
            surcharge_percent=surcharge_percent,
        )
        return ToolReply(
            f"Load {load.load_id}: {reply.text}", events + reply.events, reply.decision
        )

    def accept(self, amount_usd: object, load_id: object = "") -> ToolReply:
        load = self._target(load_id)
        blocked = self._gate(load, load_id)
        if blocked:
            return ToolReply(blocked)
        assert load is not None
        reply = accept(self.negotiation(load.load_id), amount_usd=amount_usd, load_id=load.load_id)
        return ToolReply(f"Load {load.load_id}: {reply.text}", reply.events, reply.decision)
