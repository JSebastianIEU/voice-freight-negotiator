"""Money in both directions: what the detector reads must be what the guardian says."""

import pytest

from freight_negotiator.money import amounts_in, say_amount


@pytest.mark.parametrize(
    ("amount", "spoken"),
    [
        (2_450, "twenty-four fifty"),
        (2_575, "twenty-five seventy-five"),
        (2_700, "twenty-seven hundred"),
        (2_825, "twenty-eight twenty-five"),
        (2_950, "twenty-nine fifty"),
        (3_000, "three thousand"),
        (3_050, "three thousand fifty"),
        (3_145, "thirty-one forty-five"),
        (1_200, "twelve hundred"),
        (12_450, "twelve thousand four hundred fifty"),
    ],
)
def test_say_amount(amount: int, spoken: str) -> None:
    assert say_amount(amount) == spoken


@pytest.mark.parametrize("amount", [2_450, 2_575, 2_825, 3_000, 3_050, 3_145])
def test_spoken_amounts_round_trip_through_the_detector(amount: int) -> None:
    # The guardian tells the LLM to say exactly this; the filter and the replay must read it back.
    assert amounts_in(f"I can do {say_amount(amount)} on it.") == [amount]


def test_say_amount_rejects_non_rates() -> None:
    with pytest.raises(ValueError):
        say_amount(950)


@pytest.mark.parametrize(
    "text",
    [
        "It's 1,130 miles from Laredo to Atlanta.",
        "About one thousand one hundred thirty miles, door to door.",
        "Load 4471 picks up Friday.",
        "That's load number 5560 out of Houston.",
        "Order #1187 delivers in Newark.",
        "Twenty-two hundred pounds of furniture, blanket-wrapped.",
        "We've been in business since 2009.",
        "I started driving back in twenty nineteen.",
    ],
)
def test_quantities_and_identifiers_are_not_money(text: str) -> None:
    # Long lanes put the mileage inside the money window; the filter must not silence it.
    assert amounts_in(text) == []


def test_money_next_to_a_quantity_is_still_money() -> None:
    assert amounts_in("I can do $2,700 on load 4471, it's 925 miles.") == [2_700]
    assert amounts_in("Thirty-one hundred for 1,130 miles is too low.") == [3_100]


def test_a_rate_is_not_a_year_without_the_year_words() -> None:
    # Only "since", "in", "year", "back in" make a year: a bare 2,050 stays money.
    assert amounts_in("I can do 2050 on this one.") == [2_050]
    assert amounts_in("Twenty fifty works for me.") == [2_050]


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Puedo ofrecer dos mil cuatrocientos cincuenta por toda la carga.", [2_450]),
        ("No puedo llegar a tres mil cuatrocientos.", [3_400]),
        ("Dos mil quinientos setenta y cinco es lo máximo.", [2_575]),
        ("Tres mil cien, y cerramos.", [3_100]),
        ("Son mil ciento treinta millas.", []),
        ("Es la carga cuatro mil cuatrocientos setenta y uno.", []),
        ("Desde el 2009 trabajamos juntos.", []),
    ],
)
def test_spanish_amounts_are_read_and_spanish_quantities_are_not(
    text: str, expected: list[int]
) -> None:
    assert amounts_in(text) == expected


def test_say_amount_in_spanish_is_said_in_full() -> None:
    assert say_amount(2_450, "es") == "dos mil cuatrocientos cincuenta"
    assert say_amount(2_575, "es") == "dos mil quinientos setenta y cinco"
    assert say_amount(3_100, "es") == "tres mil cien"
    assert say_amount(3_150, "es") == "tres mil ciento cincuenta"
    assert say_amount(1_000, "es") == "mil"
    # What the desk spells is what the filter reads back.
    assert amounts_in(f"Puedo ofrecer {say_amount(2_825, 'es')}.") == [2_825]
