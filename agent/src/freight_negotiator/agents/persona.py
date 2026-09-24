"""Who answers the phone. Shared by the prompt-only and the guarded negotiator."""

BROKER_NAME = "Lakeshore Freight"
REP_NAME = "Alex"


def greeting_instructions() -> str:
    return (
        f"Answer the phone as {REP_NAME} from {BROKER_NAME}: greet the caller and ask "
        "which load they are calling about. One short sentence."
    )
