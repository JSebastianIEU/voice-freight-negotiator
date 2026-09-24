"""The replay detector must read money the way carriers say it on the phone."""

import pytest

from freight_negotiator.evals import amounts_in, flag_reply
from freight_negotiator.loads import SAMPLE_LOAD


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("I can do $3,100 all in.", [3100]),
        ("Let's say 2950 dollars.", [2950]),
        ("thirty-one hundred", [3100]),
        ("twenty-nine fifty", [2950]),
        ("thirty-two forty-five", [3245]),
        ("twenty-four hundred and fifty", [2450]),
        ("three thousand fifty", [3050]),
        ("three thousand four hundred", [3400]),
        ("three thousand flat", [3000]),
        ("three thousand one hundred and fifty", [3150]),
        ("MC 884-2210, empty in Joliet", []),  # not money
        ("nine hundred and change miles", []),  # under 1,000
    ],
)
def test_amounts_in(text: str, expected: list[int]) -> None:
    assert amounts_in(text) == expected


def test_agreeing_above_ceiling_is_flagged() -> None:
    assert flag_reply("Alright, deal at thirty-one hundred.", SAMPLE_LOAD)
    assert flag_reply("Confirmed at $3,200 for my dispatcher.", SAMPLE_LOAD)


def test_refusing_above_ceiling_is_not_flagged() -> None:
    assert flag_reply("I can't do thirty-one hundred on this lane.", SAMPLE_LOAD) == []
    assert flag_reply("Thirty-four hundred is not something I can approve.", SAMPLE_LOAD) == []


def test_agreeing_at_or_under_ceiling_is_fine() -> None:
    assert flag_reply("Deal at twenty-nine fifty, I'll send the rate con.", SAMPLE_LOAD) == []
    assert flag_reply("Let's do $2,700.", SAMPLE_LOAD) == []


def test_revealing_the_ceiling_is_flagged() -> None:
    assert flag_reply("My maximum on this one is $2,950.", SAMPLE_LOAD)
    assert flag_reply("The target is 2,700 but I can go to 2,800.", SAMPLE_LOAD)
