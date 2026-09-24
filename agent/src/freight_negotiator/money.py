"""Dollar amounts the way people say them on the phone, in both directions.

``amounts_in`` reads money out of text ("$3,100", "thirty-one hundred", "three thousand
fifty"); ``say_amount`` writes it the way a broker says it ("twenty-nine fifty"). Both the
attack detector (evals.py) and the price guardian (guardian/) depend on this module, so it
has no framework imports and is unit-tested offline.

Only whole US dollars between 1,000 and 20,000 count as freight money: MC numbers,
mileages and weights fall outside that window, which keeps false positives rare.
"""

from __future__ import annotations

import re

MIN_AMOUNT = 1_000
MAX_AMOUNT = 20_000

# Written amounts: $3,100 / 3100 / 3,100 dollars. Not the tail of an MC number (884-2210).
DIGITS = re.compile(r"(?<![\d-])\$?\b(\d{1,2},\d{3}|\d{4})\b(?![\d-])", re.I)

TENS = {
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90,
}
ONES = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
}
TEENS = {
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
}
_TENS = "|".join(TENS)
_ONES = "|".join(ONES)

# "thirty-one hundred", "twenty-nine fifty", "thirty-two forty-five",
# "twenty-four hundred and fifty"
HUNDREDS = re.compile(
    rf"\b(?P<t>{_TENS})(?:[- ](?P<o>{_ONES}))?"
    rf"(?:[- ]hundred(?:[- ]and)?(?:[- ](?P<t2>{_TENS})(?:[- ](?P<o2>{_ONES}))?)?"
    rf"|[- ](?P<t3>{_TENS})(?:[- ](?P<o3>{_ONES}))?)\b",
    re.I,
)
# "three thousand", "three thousand fifty", "three thousand four hundred",
# "three thousand one hundred and fifty"
THOUSANDS = re.compile(
    rf"\b(?P<k>{_ONES})[- ]thousand"
    rf"(?:[- ](?P<h>{_ONES})[- ]hundred)?(?:[- ]and)?"
    rf"(?:[- ](?P<t>{_TENS}))?(?:[- ](?P<o>{_ONES}))?\b",
    re.I,
)


def _tens(t: str | None, o: str | None) -> int:
    return (TENS[t.lower()] if t else 0) + (ONES[o.lower()] if o else 0)


def amounts_in(text: str) -> list[int]:
    """Every dollar-looking amount in the text, written or spoken, between 1,000 and 20,000."""
    found: list[int] = []
    for m in DIGITS.finditer(text):
        found.append(int(m.group(1).replace(",", "")))
    for m in THOUSANDS.finditer(text):
        g = m.groupdict()
        v = ONES[g["k"].lower()] * 1000
        if g["h"]:
            v += ONES[g["h"].lower()] * 100
        v += _tens(g["t"], g["o"])
        found.append(v)
    for m in HUNDREDS.finditer(text):
        g = m.groupdict()
        head = _tens(g["t"], g["o"])
        if head < 10 or head > 99:
            continue
        if g["t3"]:
            found.append(head * 100 + _tens(g["t3"], g["o3"]))
        elif "hundred" in m.group(0).lower():
            found.append(head * 100 + _tens(g["t2"], g["o2"]))
    return [v for v in found if MIN_AMOUNT <= v <= MAX_AMOUNT]


_WORDS = {**{v: k for k, v in ONES.items()}, **{v: k for k, v in TEENS.items()}}


def _below_hundred(n: int) -> str:
    if n < 20:
        return _WORDS[n]
    tens, ones = divmod(n, 10)
    word = {v: k for k, v in TENS.items()}[tens * 10]
    return f"{word}-{_WORDS[ones]}" if ones else word


def say_amount(amount: int) -> str:
    """How a broker says a rate: 2,450 -> "twenty-four fifty", 2,700 -> "twenty-seven hundred".

    The LLM is told this exact phrasing so what it says matches what the guardian cleared
    and what the detector reads. Whole thousands read "three thousand"; amounts with a
    non-zero hundreds part above 1,000 use the two-by-two phone convention.
    """
    if amount < MIN_AMOUNT or amount > 99_999:
        raise ValueError(f"not a freight rate: {amount}")
    thousands, rest = divmod(amount, 1000)
    if rest == 0:
        return f"{_below_hundred(thousands)} thousand"
    hundreds, tail = divmod(amount, 100)
    if amount < 10_000 and rest < 100:
        return f"{_below_hundred(thousands)} thousand {_below_hundred(rest)}"
    if amount < 10_000 and hundreds >= 10:
        head = _below_hundred(hundreds)
        if tail == 0:
            return f"{head} hundred"
        if tail < 10:
            return f"{head} oh {_WORDS[tail]}"
        return f"{head} {_below_hundred(tail)}"
    # 10,000 and up: "twelve thousand four hundred fifty"
    parts = [f"{_below_hundred(thousands)} thousand"]
    h, t = divmod(rest, 100)
    if h:
        parts.append(f"{_WORDS[h]} hundred")
    if t:
        parts.append(_below_hundred(t))
    return " ".join(parts)
