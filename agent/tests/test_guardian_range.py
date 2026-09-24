"""The wall: one function decides whether an amount may be paid, from the load record only."""

import pytest

from freight_negotiator.guardian.range import validate
from freight_negotiator.loads import SAMPLE_LOAD

PRICES = SAMPLE_LOAD.prices


@pytest.mark.parametrize("amount", [2_950, 2_949, 2_450, 2_000, "2600", 2_700.0])
def test_at_or_under_the_ceiling_is_approved(amount: object) -> None:
    v = validate(amount, PRICES)
    assert v.ok and v.reason == "ok"


@pytest.mark.parametrize("amount", [2_951, 3_000, 3_100, "3400", 2_950.4 + 1])
def test_above_the_ceiling_is_rejected(amount: object) -> None:
    v = validate(amount, PRICES)
    assert not v.ok and v.reason == "above_ceiling"


@pytest.mark.parametrize("amount", [None, "three thousand", -1, 0, 250_000, float("nan")])
def test_garbage_is_not_a_rate_and_never_raises(amount: object) -> None:
    v = validate(amount, PRICES)
    assert not v.ok and v.reason == "not_a_rate"


def test_labels_never_contain_a_bound() -> None:
    for amount in (2_600, 3_400, None):
        label = validate(amount, PRICES).label
        for bound in (PRICES.floor, PRICES.target, PRICES.ceiling):
            assert str(bound) not in label and f"{bound:,}" not in label
