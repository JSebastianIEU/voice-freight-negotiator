"""The LiveKit tools as the model calls them: the desk's answer comes back, its events go out.

``test_desk.py`` covers what the desk decides. These tests cover the thin layer around it:
each tool returns the desk's text to the model and publishes the desk's events to the room,
in order, and ``end_call`` announces the end of the call even outside a LiveKit job.
"""

from typing import Any

from freight_negotiator.carriers import DIRECTORY
from freight_negotiator.guardian.desk import CallState
from freight_negotiator.guardian.events import GuardianEvent
from freight_negotiator.guardian.tools import guardian_tools
from freight_negotiator.loads import CATALOG

NO_CONTEXT: Any = None  # the tools never read the RunContext except end_call, which tolerates it


def bound_tools(published: list[GuardianEvent] | None) -> dict[str, Any]:
    call = CallState(posted=CATALOG["CHI-DAL-4471"], loads=CATALOG, directory=DIRECTORY)

    async def publish(event: GuardianEvent) -> None:
        assert published is not None
        published.append(event)

    tools = guardian_tools(call, publish if published is not None else None)
    return {t.info.name: t for t in tools}


def test_the_model_gets_exactly_five_tools() -> None:
    assert list(bound_tools([])) == [
        "verify_carrier",
        "find_loads",
        "propose_rate",
        "accept_rate",
        "end_call",
    ]


async def test_a_whole_negotiation_reaches_the_browser_in_order() -> None:
    published: list[GuardianEvent] = []
    tools = bound_tools(published)

    verified = await tools["verify_carrier"](NO_CONTEXT, "884-2210", "Redline Transport")
    assert "Verified: Redline Transport" in verified

    opening = await tools["propose_rate"](NO_CONTEXT)
    assert "$2,450" in opening

    countered = await tools["propose_rate"](NO_CONTEXT, carrier_ask_usd=3_400)
    assert "not approved" in countered and "$2,575" in countered

    booked = await tools["accept_rate"](NO_CONTEXT, 2_575)
    assert "rate confirmation" in booked

    assert [e.type for e in published] == [
        "carrier.verified",
        "rate.proposed",
        "rate.rejected",
        "rate.proposed",
        "rate.accepted",
    ]


async def test_no_rate_and_no_rate_event_before_the_caller_is_verified() -> None:
    published: list[GuardianEvent] = []
    tools = bound_tools(published)
    reply = await tools["propose_rate"](NO_CONTEXT, carrier_ask_usd=2_000)
    assert "$" not in reply
    assert not any(e.type.startswith("rate.") for e in published)


async def test_find_loads_answers_without_a_rate() -> None:
    tools = bound_tools([])
    reply = await tools["find_loads"](NO_CONTEXT, equipment="reefer")
    assert reply and "$" not in reply


async def test_tools_work_without_a_room_to_publish_to() -> None:
    tools = bound_tools(None)  # text mode: the attack replay runs without a room
    assert "Verified" in await tools["verify_carrier"](NO_CONTEXT, "884-2210", "Redline Transport")


async def test_end_call_announces_the_end_and_silences_the_model() -> None:
    published: list[GuardianEvent] = []
    tools = bound_tools(published)
    reply = await tools["end_call"](NO_CONTEXT, reason="booked")
    assert reply == "The call is over. Say nothing more."
    assert [(e.type, e.to_dict()["reason"]) for e in published] == [("call.ended", "booked")]
