"""Publish guardian events on the LiveKit data channel of one room.

Reliable delivery, topic ``guardian``: the web client subscribes with ``useDataChannel``
and the Core reacts (docs/design/core.md). Kept apart from the pure guardian modules so
they stay importable without a room.
"""

from __future__ import annotations

import logging

from livekit import rtc

from freight_negotiator.guardian.events import GUARDIAN_TOPIC, GuardianEvent, Publisher

logger = logging.getLogger(__name__)


def room_publisher(room: rtc.Room) -> Publisher:
    async def publish(event: GuardianEvent) -> None:
        try:
            await room.local_participant.publish_data(
                event.to_json().encode("utf-8"), reliable=True, topic=GUARDIAN_TOPIC
            )
        except Exception:  # a dropped event must never break the call
            logger.warning("could not publish guardian event %s", event, exc_info=True)

    return publish
