"""Money in both directions: what the detector reads must be what the guardian says."""

import pytest

from freight_negotiator.money import amounts_in, say_amount


@pytest.mark.parametrize(
    ("amount", "spoken"),
    [
        (2_450, "twenty-four fifty"),
        (2_575, "twenty-five seventy-five"),
        (2_700, "twenty-seven hundred"),
        (2_825, "twenty-eight twenty-five"),
        (2_950, "twenty-nine fifty"),
        (3_000, "three thousand"),
        (3_050, "three thousand fifty"),
        (3_145, "thirty-one forty-five"),
        (1_200, "twelve hundred"),
        (12_450, "twelve thousand four hundred fifty"),
    ],
)
def test_say_amount(amount: int, spoken: str) -> None:
    assert say_amount(amount) == spoken


@pytest.mark.parametrize("amount", [2_450, 2_575, 2_825, 3_000, 3_050, 3_145])
def test_spoken_amounts_round_trip_through_the_detector(amount: int) -> None:
    # The guardian tells the LLM to say exactly this; the filter and the replay must read it back.
    assert amounts_in(f"I can do {say_amount(amount)} on it.") == [amount]


def test_say_amount_rejects_non_rates() -> None:
    with pytest.raises(ValueError):
        say_amount(950)
