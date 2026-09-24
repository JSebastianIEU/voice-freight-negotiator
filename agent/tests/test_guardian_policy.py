"""The concession policy replays the milestone 2 attacks against code instead of a prompt."""

from freight_negotiator.guardian.events import events_for
from freight_negotiator.guardian.policy import Negotiation, build_ladder
from freight_negotiator.loads import SAMPLE_LOAD, PriceRange

PRICES = SAMPLE_LOAD.prices  # floor 2,450 · target 2,700 · ceiling 2,950


def test_ladder_climbs_from_floor_to_a_final_below_the_ceiling() -> None:
    assert build_ladder(PRICES) == [2_450, 2_575, 2_700, 2_825]


def test_ladder_never_offers_the_ceiling() -> None:
    for share in (0.0, 0.5, 0.99):
        assert build_ladder(PRICES, final_share=share)[-1] < PRICES.ceiling
    assert build_ladder(PriceRange(2_000, 2_000, 2_000)) == [2_000]


def test_opens_at_the_floor_when_asked_what_it_pays() -> None:
    n = Negotiation(PRICES)
    d = n.respond(None)
    assert (d.action, d.amount) == ("open", 2_450)
    assert n.respond(None).action == "hold"


def test_anchor_high_climbs_one_rung_per_carrier_move_and_stops_at_final() -> None:
    # Attack 1: 3,600 -> 3,100 -> 2,950. Prompt-only gave $500; the policy gives at most $375.
    n = Negotiation(PRICES)
    n.respond(None)
    assert n.respond(3_600).action == "counter" and n.current_offer == 2_575
    assert n.respond(3_100).action == "counter" and n.current_offer == 2_700
    d = n.respond(2_950)
    assert d.action == "final" and d.amount == 2_825
    assert n.respond(2_900).action == "final" and n.current_offer == 2_825
    assert max(n.ladder) < PRICES.ceiling


def test_repeating_the_same_number_does_not_move_the_agent() -> None:
    # Attacks 2, 3, 8: the same figure three times, with pressure. One counter, then hold.
    n = Negotiation(PRICES)
    n.respond(None)
    assert n.respond(3_100).action == "counter"
    assert n.respond(3_100).action == "hold"
    assert n.respond(3_100).action == "hold"
    assert n.current_offer == 2_575


def test_over_ceiling_asks_are_rejected_and_never_offered() -> None:
    n = Negotiation(PRICES)
    n.respond(None)
    d = n.respond(3_400)
    assert d.rejected_ask and d.ask is not None and d.ask.reason == "above_ceiling"
    assert d.amount == 2_575
    assert n.book(3_400).action == "refused" and n.booked is None


def test_meets_a_carrier_who_lands_inside_the_next_step() -> None:
    n = Negotiation(PRICES)
    n.respond(None)  # 2,450
    d = n.respond(2_500)  # under the next rung (2,575): accept at their number
    assert (d.action, d.amount) == ("accept", 2_500)
    assert n.book(2_500).action == "booked" and n.booked == 2_500


def test_under_ask_is_a_deal_at_their_number() -> None:
    n = Negotiation(PRICES)
    n.respond(None)
    d = n.respond(2_300)
    assert (d.action, d.amount) == ("accept", 2_300)
    assert n.book(2_300).action == "booked"


def test_booking_only_at_or_under_what_was_offered() -> None:
    n = Negotiation(PRICES)
    n.respond(None)  # 2,450 on the table
    assert n.book(2_700).action == "refused"  # in range, but never offered
    assert n.book(2_450).action == "booked"
    assert n.book(2_400).action == "booked" and n.booked == 2_450  # already closed


def test_garbage_asks_do_not_advance_the_ladder() -> None:
    n = Negotiation(PRICES)
    assert n.respond("lots").action == "open"
    assert n.respond(None).action == "hold"
    assert n.current_offer == 2_450


def test_cleared_contains_every_amount_the_guardian_saw() -> None:
    n = Negotiation(PRICES)
    n.respond(None)
    n.respond(3_100)
    assert n.cleared == {2_450, 3_100, 2_575}


def test_events_follow_the_decision() -> None:
    n = Negotiation(PRICES)
    ev = events_for(n.respond(None), now=1.0)
    assert [(e.type, e.amount, e.reason) for e in ev] == [("rate.proposed", 2_450, "opening offer")]
    ev = events_for(n.respond(3_100), now=1.0)
    assert [(e.type, e.amount) for e in ev] == [("rate.rejected", 3_100), ("rate.proposed", 2_575)]
    ev = events_for(n.respond(2_575), now=1.0)
    assert [(e.type, e.amount) for e in ev] == [("rate.accepted", 2_575)]
    ev = events_for(n.book(2_575), now=1.0)
    assert [(e.type, e.amount, e.reason) for e in ev] == [("rate.accepted", 2_575, "booked")]
    assert '"type":"rate.accepted"' in ev[0].to_json()
