"""The second layer: a number the guardian never saw does not reach text-to-speech."""

import asyncio
from collections.abc import AsyncIterator

from livekit.agents import llm

from freight_negotiator.guardian.output_filter import (
    REPLACEMENT,
    SentenceFilter,
    filtered_text,
    screen_llm_stream,
)

ALLOWED = {2_450, 2_575, 3_100}


def test_cleared_amounts_pass_untouched() -> None:
    text = "I can't do thirty-one hundred. I can go to twenty-five seventy-five on it."
    assert filtered_text(text, ALLOWED) == text


def test_unknown_amount_replaces_only_its_sentence() -> None:
    text = "Understood. Confirmed at thirty-two hundred. Let me know about the driver."
    assert (
        filtered_text(text, ALLOWED) == f"Understood. {REPLACEMENT} Let me know about the driver."
    )


def test_second_block_in_a_turn_is_dropped_not_repeated() -> None:
    text = "Deal at $3,200. Also fine at $3,300. Thanks."
    assert filtered_text(text, ALLOWED) == f"{REPLACEMENT} Thanks."


def test_no_sentence_boundary_still_screens_at_the_end() -> None:
    assert filtered_text("Confirmed at 3200", ALLOWED) == REPLACEMENT


def test_streaming_holds_text_until_the_sentence_ends() -> None:
    f = SentenceFilter(lambda: ALLOWED)
    assert f.feed("I can go to twenty-five ") == ""
    assert f.feed("seventy-five. Confirmed at thirty") == "I can go to twenty-five seventy-five. "
    assert f.feed("-two hundred. ") == f"{REPLACEMENT} "
    assert f.flush() == ""


async def _chunks(*texts: str, tool_call: bool = False) -> AsyncIterator[llm.ChatChunk | str]:
    for t in texts:
        yield llm.ChatChunk(id="x", delta=llm.ChoiceDelta(role="assistant", content=t))
    if tool_call:
        call = llm.FunctionToolCall(name="propose_rate", arguments="{}", call_id="c1")
        yield llm.ChatChunk(id="x", delta=llm.ChoiceDelta(role="assistant", tool_calls=[call]))


def _collect(stream: AsyncIterator[llm.ChatChunk | str]) -> list[llm.ChatChunk | str]:
    async def run() -> list[llm.ChatChunk | str]:
        return [item async for item in stream]

    return asyncio.run(run())


def test_chat_chunks_are_rewritten_and_tool_calls_pass_through() -> None:
    blocked: list[tuple[str, list[int]]] = []
    out = _collect(
        screen_llm_stream(
            _chunks("Sure, confirmed at 3200. ", "Twenty-four fifty is my offer", tool_call=True),
            lambda: ALLOWED,
            lambda s, u: blocked.append((s, u)),
        )
    )
    texts = [
        c.delta.content for c in out if isinstance(c, llm.ChatChunk) and c.delta and c.delta.content
    ]
    assert "".join(texts) == f"{REPLACEMENT} Twenty-four fifty is my offer"
    assert any(isinstance(c, llm.ChatChunk) and c.delta and c.delta.tool_calls for c in out)
    assert blocked == [("Sure, confirmed at 3200.", [3_200])]


def test_allow_list_is_read_live_so_a_tool_call_mid_turn_counts() -> None:
    allowed: set[int] = set()
    f = SentenceFilter(lambda: allowed)
    assert f.feed("Twenty-six hundred works. ") == f"{REPLACEMENT} "
    allowed.add(2_600)
    f2 = SentenceFilter(lambda: allowed)
    assert f2.feed("Twenty-six hundred works. ") == "Twenty-six hundred works. "
