"""The load model is plain data; these pin its invariants and its spoken form."""

import pytest

from freight_negotiator.loads import SAMPLE_LOAD, PriceRange


def test_price_range_orders_floor_target_ceiling() -> None:
    with pytest.raises(ValueError):
        PriceRange(floor=3000, target=2700, ceiling=2950)
    with pytest.raises(ValueError):
        PriceRange(floor=2450, target=2700, ceiling=2600)


def test_price_range_contains_is_inclusive() -> None:
    r = PriceRange(floor=2450, target=2700, ceiling=2950)
    assert r.contains(2450) and r.contains(2950)
    assert not r.contains(2449) and not r.contains(2951)


def test_sample_load_keeps_margin() -> None:
    load = SAMPLE_LOAD
    assert load.prices.ceiling < load.sell_rate
    assert (load.sell_rate - load.prices.ceiling) / load.sell_rate >= 0.10


def test_brief_never_mentions_money() -> None:
    brief = SAMPLE_LOAD.brief()
    assert "$" not in brief
    for amount in (SAMPLE_LOAD.sell_rate, *vars(SAMPLE_LOAD.prices).values()):
        assert f"{amount:,}" not in brief and str(amount) not in brief
    assert "Chicago, Illinois" in brief and "Dallas, Texas" in brief
    assert "8 am and 2 pm" in brief
