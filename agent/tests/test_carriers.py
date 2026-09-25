"""The carrier directory: MC lookup, authority status, equipment and names."""

import pytest

from freight_negotiator.carriers import DIRECTORY, compatible, mc_digits, names_match


@pytest.mark.parametrize("raw", ["884-2210", "MC 884-2210", "8842210", "884 2210", 8842210])
def test_mc_numbers_are_read_as_digits(raw: object) -> None:
    assert mc_digits(raw) == "8842210"
    rec = DIRECTORY.lookup(raw)
    assert rec is not None and rec.company == "Redline Transport" and rec.active


def test_unknown_and_empty_mc_are_not_found() -> None:
    assert DIRECTORY.lookup("123-4567") is None
    assert DIRECTORY.lookup("") is None
    assert DIRECTORY.lookup(None) is None


def test_revoked_authority_is_in_the_directory_but_inactive() -> None:
    rec = DIRECTORY.lookup("555-0199")
    assert rec is not None and rec.company == "Double Nickel Hauling" and not rec.active


@pytest.mark.parametrize(
    ("carrier", "load", "ok"),
    [
        (["53' dry van"], "53' dry van", True),
        (["53' reefer"], "53' dry van", True),  # a reefer can run dry
        (["53' dry van"], "53' reefer", False),
        (["48' flatbed"], "53' dry van", False),
        (["53' dry van", "53' reefer"], "53' reefer", True),
    ],
)
def test_equipment_compatibility(carrier: list[str], load: str, ok: bool) -> None:
    assert compatible(carrier, load) is ok


@pytest.mark.parametrize(
    ("given", "registered", "ok"),
    [
        ("Redline", "Redline Transport", True),
        ("Red Line Transport", "Redline Transport", True),  # how STT writes it
        ("redline transport llc", "Redline Transport", True),
        ("", "Redline Transport", True),
        ("Bluebonnet", "Bluebonnet Logistics", True),
        ("Double Nickel", "Redline Transport", False),
        ("Redline Transport", "Double Nickel Hauling", False),
        ("Transport", "Redline Transport", False),  # a generic word identifies nobody
    ],
)
def test_names_match(given: str, registered: str, ok: bool) -> None:
    assert names_match(given, registered) is ok
