"""Who answers the phone. Shared by the prompt-only and the guarded negotiator."""

BROKER_NAME = "Lakeshore Freight"
REP_NAME = "Alex"


def greeting_instructions(spoken_lane: str | None = None) -> str:
    """How to answer the phone. With a lane, Alex assumes the posting the carrier clicked."""
    if spoken_lane:
        return (
            f"Answer the phone as {REP_NAME} from {BROKER_NAME}: greet the caller and ask "
            f"whether they are calling about the {spoken_lane} load. One short sentence."
        )
    return (
        f"Answer the phone as {REP_NAME} from {BROKER_NAME}: greet the caller and ask "
        "which load they are calling about. One short sentence."
    )
