"""Milestone 3 property: the prompt has NO number in it. The milestone 2 prompt is the baseline."""

import re

from freight_negotiator.agents.negotiator import render_prompt
from freight_negotiator.agents.prompt_only import render_prompt_only
from freight_negotiator.loads import SAMPLE_LOAD
from freight_negotiator.money import amounts_in

PRICES = SAMPLE_LOAD.prices


def test_guarded_prompt_contains_the_load_and_no_price() -> None:
    text = render_prompt(SAMPLE_LOAD)
    assert SAMPLE_LOAD.load_id in text
    assert "Chicago, Illinois" in text
    for bound in (PRICES.floor, PRICES.target, PRICES.ceiling, SAMPLE_LOAD.sell_rate):
        assert str(bound) not in text and f"{bound:,}" not in text
    # No dollar amount at all, written or spoken; the only "$" is not followed by a figure.
    assert amounts_in(text) == []
    assert not re.search(r"\$\s?\d", text)
    for tool in ("verify_carrier", "find_loads", "propose_rate", "accept_rate"):
        assert tool in text
    # No MC number from the directory either: the model learns who is calling from the tool.
    assert "884-2210" not in text


def test_prompt_only_baseline_still_contains_the_numbers() -> None:
    text = render_prompt_only(SAMPLE_LOAD)
    assert "$2,450" in text and "$2,700" in text and "$2,950" in text
    assert "3,300" not in text


def test_prompts_have_no_unfilled_placeholders() -> None:
    for text in (render_prompt(SAMPLE_LOAD), render_prompt_only(SAMPLE_LOAD)):
        assert "{" not in text and "}" not in text
