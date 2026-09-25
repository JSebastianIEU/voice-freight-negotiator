"""Who answers the phone. Shared by the prompt-only and the guarded negotiator."""

BROKER_NAME = "Lakeshore Freight"
REP_NAME = "Alex"


LANGUAGES = {"en": "English", "es": "Spanish"}


def language_name(lang: str | None) -> str:
    return LANGUAGES.get((lang or "en").lower()[:2], "English")


def greeting_instructions(spoken_lane: str | None = None, lang: str = "en") -> str:
    """How to answer the phone. With a lane, Alex assumes the posting the carrier clicked."""
    tongue = f" Speak {language_name(lang)}."
    if spoken_lane:
        return (
            f"Answer the phone as {REP_NAME} from {BROKER_NAME}: greet the caller and ask "
            f"whether they are calling about the {spoken_lane} load. One short sentence.{tongue}"
        )
    return (
        f"Answer the phone as {REP_NAME} from {BROKER_NAME}: greet the caller and ask "
        f"which load they are calling about. One short sentence.{tongue}"
    )
