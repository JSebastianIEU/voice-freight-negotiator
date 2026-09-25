"""The desk across a whole call: who is calling, which load, what it pays, and the gates."""

from freight_negotiator.carriers import DIRECTORY
from freight_negotiator.guardian.desk import CallState
from freight_negotiator.loads import CATALOG, SAMPLE_LOAD


def call(posted: str = "CHI-DAL-4471") -> CallState:
    return CallState(posted=CATALOG[posted], loads=CATALOG, directory=DIRECTORY)


def types(reply) -> list[str]:  # noqa: ANN001
    return [e.type for e in reply.events]


# --- verify_carrier ----------------------------------------------------------------


def test_verified_carrier_is_read_back_by_name() -> None:
    c = call()
    r = c.verify("884-2210", "Redline Transport")
    assert c.carrier is not None and c.carrier.company == "Redline Transport"
    assert "Verified: Redline Transport" in r.text and "can haul load CHI-DAL-4471" in r.text
    assert types(r) == ["carrier.verified"]
    assert r.events[0].to_dict() == {
        "type": "carrier.verified",
        "ts": r.events[0].ts,
        "company": "Redline Transport",
        "mc": "884-2210",
    }


def test_unknown_mc_is_asked_again_then_refused() -> None:
    c = call()
    first = c.verify("123-4567", "Acme")
    assert c.carrier is None and "repeat the MC number" in first.text
    assert types(first) == ["carrier.rejected"] and first.events[0].reason == "not found"
    second = c.verify("123-4567", "Acme")
    assert "end the call" in second.text and c.carrier is None


def test_inactive_authority_is_refused() -> None:
    c = call()
    r = c.verify("555-0199", "Double Nickel Hauling")
    assert c.carrier is None and "not active" in r.text
    assert r.events[0].reason == "authority inactive"


def test_borrowed_identity_is_caught_by_the_name() -> None:
    # Someone says they are Redline but reads Double Nickel's MC... or the other way round.
    c = call()
    r = c.verify("884-2210", "Double Nickel Hauling")
    assert c.carrier is None and "registered to Redline Transport" in r.text
    assert r.events[0].reason == "name mismatch"
    c.verify("884-2210", "Redline")
    assert c.carrier is not None


def test_no_mc_no_lookup() -> None:
    c = call()
    assert "Ask the caller for their MC number" in c.verify("", "Redline").text
    assert c.carrier is None


# --- the gates ---------------------------------------------------------------------


def test_no_rate_before_verification() -> None:
    c = call()
    r = c.propose(carrier_ask_usd=3_400)
    assert "not verified" in r.text and r.events == [] and r.decision is None
    assert "$" not in r.text
    # The caller's number is remembered only as something to decline.
    assert c.declinable() == {3_400} and c.speakable() == set()
    assert "not verified" in c.accept(2_450).text


def test_equipment_that_cannot_haul_the_load_gets_no_quote() -> None:
    c = call()
    c.verify("958-4471", "Iron Horse Flatbed")  # flatbed calling about a dry van load
    assert "cannot haul load CHI-DAL-4471" in c.verify("958-4471", "Iron Horse").text
    r = c.propose()
    assert "cannot haul" in r.text and "find_loads" in r.text and r.events == []


def test_a_reefer_may_haul_dry_van_freight() -> None:
    c = call()
    c.verify("612-3387", "High Desert Carriers")
    r = c.propose()
    assert r.decision is not None and r.decision.action == "open"


# --- rates across loads ------------------------------------------------------------


def test_opening_offer_carries_the_load_id() -> None:
    c = call()
    c.verify("884-2210", "Redline")
    r = c.propose()
    assert r.text.startswith("Load CHI-DAL-4471: ") and "$2,450" in r.text
    assert [(e.type, e.amount, e.load_id) for e in r.events] == [
        ("rate.proposed", 2_450, "CHI-DAL-4471")
    ]


def test_each_load_has_its_own_negotiation() -> None:
    c = call()
    c.verify("731-9054", "Bluebonnet")
    c.propose()  # Chicago - Dallas opens at its floor
    c.propose(carrier_ask_usd=3_600)  # climbs a rung there
    r = c.propose("LRD-ATL-2208")  # Laredo - Atlanta opens at its own floor
    assert "$2,900" in r.text
    assert [e.type for e in r.events] == ["load.focus", "rate.proposed"]
    assert c.negotiation("CHI-DAL-4471").current_offer == 2_575
    assert c.focus == "LRD-ATL-2208"


def test_booking_needs_an_offer_on_that_load() -> None:
    c = call()
    c.verify("884-2210", "Redline")
    c.propose()
    assert "never offered" in c.accept(2_700).text
    booked = c.accept(2_450)
    assert "Booked at $2,450" in booked.text
    assert [(e.type, e.reason, e.load_id) for e in booked.events] == [
        ("rate.accepted", "booked", "CHI-DAL-4471")
    ]


def test_speakable_and_declinable_follow_the_desk() -> None:
    c = call()
    c.verify("884-2210", "Redline")
    c.propose()
    c.propose(carrier_ask_usd=3_400)
    assert c.speakable() == {2_450, 2_575}
    assert c.declinable() == {3_400}


def test_unknown_load_id_is_sent_to_find_loads() -> None:
    c = call()
    c.verify("884-2210", "Redline")
    assert "find_loads" in c.propose("XYZ-0000").text


# --- find_loads --------------------------------------------------------------------


def test_find_by_origin_destination_equipment_and_number() -> None:
    c = call()
    assert "HOU-DEN-5560" in c.find(origin="Houston").text
    assert "HOU-DEN-5560" in c.find(equipment="flatbed").text
    assert "LAX-PHX-9031" in c.find(destination="Arizona").text
    r = c.find(load_id="5560")
    assert "HOU-DEN-5560" in r.text and types(r) == ["load.focus"] and c.focus == "HOU-DEN-5560"


def test_find_with_no_match_lists_the_board() -> None:
    r = call().find(origin="Seattle")
    assert "No open load matches" in r.text and "MEM-CHI-7742" in r.text


def test_flatbed_is_steered_to_the_flatbed_load() -> None:
    c = call()
    c.verify("958-4471", "Iron Horse")
    c.find(load_id="HOU-DEN-5560")
    r = c.propose()
    assert r.text.startswith("Load HOU-DEN-5560: ") and "$2,850" in r.text


# --- nothing private leaks ---------------------------------------------------------


def test_no_reply_ever_contains_a_ceiling_or_a_target() -> None:
    c = call()
    texts = [
        c.verify("884-2210", "Redline").text,
        c.find(origin="Chicago").text,
        c.find(origin="").text,
    ]
    for ask in (3_600, 3_100, 2_950, 2_950):
        texts.append(c.propose(carrier_ask_usd=ask).text)
    texts.append(c.accept(2_950).text)
    for load in CATALOG.values():
        for t in texts:
            assert f"{load.prices.ceiling:,}" not in t or f"carrier's ${load.prices.ceiling:,}" in t
            assert str(load.sell_rate) not in t and f"{load.sell_rate:,}" not in t


def test_sample_load_is_the_default_posting() -> None:
    assert call().posted is SAMPLE_LOAD
