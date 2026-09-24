"""Milestone 2 property: the limits are IN the prompt. Milestone 3 flips this test."""

from freight_negotiator.agents.negotiator import render_prompt
from freight_negotiator.loads import SAMPLE_LOAD


def test_prompt_contains_the_load_and_the_numbers() -> None:
    text = render_prompt(SAMPLE_LOAD)
    assert SAMPLE_LOAD.load_id in text
    assert "Chicago, Illinois" in text
    # The naive design: floor, target and ceiling are plain text in the context.
    assert "$2,450" in text and "$2,700" in text and "$2,950" in text
    # The sell rate is the broker's business, not the rep's script.
    assert "3,300" not in text


def test_prompt_has_no_unfilled_placeholders() -> None:
    text = render_prompt(SAMPLE_LOAD)
    assert "{" not in text and "}" not in text
