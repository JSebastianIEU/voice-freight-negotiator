"""What the desk says back to the model: one figure, how to say it, and never the range."""

import pytest

from freight_negotiator.agents.negotiator import NegotiatorAgent
from freight_negotiator.guardian.desk import accept, propose
from freight_negotiator.guardian.policy import Negotiation
from freight_negotiator.loads import SAMPLE_LOAD
from freight_negotiator.money import amounts_in

PRICES = SAMPLE_LOAD.prices
# The floor is the opening offer and the target is a rung of the ladder, so both are said
# as plain offers. The ceiling is the wall: it is never a figure of ours.
BOUNDS = (PRICES.ceiling,)


def test_opening_reply_tells_the_model_the_one_figure_and_how_to_say_it() -> None:
    n = Negotiation(PRICES)
    r = propose(n, SAMPLE_LOAD)
    assert r.decision.action == "open"
    assert "$2,450" in r.text and "twenty-four fifty" in r.text
    assert amounts_in(r.text) == [2_450, 2_450]  # digits + spoken form, nothing else


def test_rejection_reply_names_the_carrier_figure_but_no_bound() -> None:
    n = Negotiation(PRICES)
    propose(n, SAMPLE_LOAD)
    r = propose(n, SAMPLE_LOAD, carrier_ask_usd=3_400)
    assert r.decision.rejected_ask
    assert "not approved" in r.text and "$3,400" in r.text and "$2,575" in r.text
    for bound in BOUNDS:
        assert f"{bound:,}" not in r.text and str(bound) not in r.text
    assert [e.type for e in r.events] == ["rate.rejected", "rate.proposed"]


def test_per_mile_ask_is_converted_by_the_code_not_the_model() -> None:
    # Attack 5: "three-forty a mile" on 925 miles is $3,145, above the ceiling.
    n = Negotiation(PRICES)
    propose(n, SAMPLE_LOAD)
    r = propose(n, SAMPLE_LOAD, carrier_ask_per_mile=3.40)
    assert "$3.40 per mile on 925 miles is $3,145" in r.text
    assert r.decision.ask is not None and r.decision.ask.amount == 3_145
    assert r.decision.rejected_ask


def test_accept_only_closes_at_an_offered_amount() -> None:
    n = Negotiation(PRICES)
    propose(n, SAMPLE_LOAD)  # 2,450 on the table
    refused = accept(n, amount_usd=3_100)
    assert refused.decision.action == "refused" and "Cannot book" in refused.text
    assert [e.type for e in refused.events] == ["rate.rejected"]
    booked = accept(n, amount_usd=2_450)
    assert booked.decision.action == "booked" and "rate confirmation" in booked.text
    assert [e.type for e in booked.events] == ["rate.accepted"]


def test_no_reply_ever_offers_the_ceiling() -> None:
    n = Negotiation(PRICES)
    texts = [propose(n, SAMPLE_LOAD).text]
    for ask in (3_600, 3_100, 2_950, 2_950, 2_900, 2_825):
        texts.append(propose(n, SAMPLE_LOAD, carrier_ask_usd=ask).text)
    texts.append(accept(n, amount_usd=2_950).text)
    texts.append(accept(n, amount_usd=2_825).text)
    for t in texts:
        for bound in BOUNDS:
            assert f"{bound:,}" not in t or f"carrier's ${bound:,}" in t, t


@pytest.mark.parametrize("garbage", ["a lot", None, -5])
def test_garbage_asks_get_a_usable_reply(garbage: object) -> None:
    n = Negotiation(PRICES)
    r = propose(n, SAMPLE_LOAD, carrier_ask_usd=garbage)
    assert r.decision.amount == 2_450


def test_agent_registers_the_four_desk_tools_and_no_number_in_instructions() -> None:
    agent = NegotiatorAgent(SAMPLE_LOAD)
    names = {getattr(t, "name", None) or t.info.name for t in agent.tools}  # type: ignore[union-attr]
    assert {"verify_carrier", "find_loads", "propose_rate", "accept_rate"} <= names
    assert amounts_in(agent.instructions) == []
