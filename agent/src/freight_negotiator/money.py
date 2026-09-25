"""Dollar amounts the way people say them on the phone, in both directions.

``amounts_in`` reads money out of text ("$3,100", "thirty-one hundred", "three thousand
fifty"); ``say_amount`` writes it the way a broker says it ("twenty-nine fifty"). Both the
attack detector (evals.py) and the price guardian (guardian/) depend on this module, so it
has no framework imports and is unit-tested offline.

Only whole US dollars between 1,000 and 20,000 count as freight money. The window keeps
most quantities out, but not all: "1,130 miles" (Laredo to Atlanta) or "load 4471" sit
inside it. A number followed by a unit (miles, pounds, feet, degrees) or introduced as an
identifier (load, order, reference, MC) is a quantity, not money, and is skipped. Without
that rule the output filter would silence Alex every time it read the mileage of a long lane.
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

# --- Spanish ------------------------------------------------------------------------
# Rates in Spanish are said in full: "dos mil cuatrocientos cincuenta", never two by two.
ES_ONES = {
    "un": 1,
    "uno": 1,
    "una": 1,
    "dos": 2,
    "tres": 3,
    "cuatro": 4,
    "cinco": 5,
    "seis": 6,
    "siete": 7,
    "ocho": 8,
    "nueve": 9,
}
ES_TEENS = {
    "diez": 10,
    "once": 11,
    "doce": 12,
    "trece": 13,
    "catorce": 14,
    "quince": 15,
    "dieciseis": 16,
    "diecisiete": 17,
    "dieciocho": 18,
    "diecinueve": 19,
    "veinte": 20,
    "veintiuno": 21,
    "veintiun": 21,
    "veintidos": 22,
    "veintitres": 23,
    "veinticuatro": 24,
    "veinticinco": 25,
    "veintiseis": 26,
    "veintisiete": 27,
    "veintiocho": 28,
    "veintinueve": 29,
}
ES_TENS = {
    "treinta": 30,
    "cuarenta": 40,
    "cincuenta": 50,
    "sesenta": 60,
    "setenta": 70,
    "ochenta": 80,
    "noventa": 90,
}
ES_HUNDREDS = {
    "cien": 100,
    "ciento": 100,
    "doscientos": 200,
    "trescientos": 300,
    "cuatrocientos": 400,
    "quinientos": 500,
    "seiscientos": 600,
    "setecientos": 700,
    "ochocientos": 800,
    "novecientos": 900,
}
_ES_K = "|".join([*ES_TEENS, *ES_ONES])
_ES_H = "|".join(ES_HUNDREDS)
_ES_T = "|".join([*ES_TEENS, *ES_TENS])
_ES_O = "|".join(ES_ONES)
SPANISH = re.compile(
    rf"\b(?:(?P<k>{_ES_K})[ ]+)?mil"
    rf"(?:[ ]+(?P<h>{_ES_H}))?"
    rf"(?:[ ]+(?P<t>{_ES_T}))?"
    rf"(?:[ ]+y[ ]+(?P<o>{_ES_O}))?\b",
    re.I,
)
_ACCENTS = str.maketrans("áéíóú", "aeiou")

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


# "1,130 miles", "42,000 pounds", "34 degrees": what follows makes it a quantity.
UNIT_AFTER = re.compile(
    r"^\s*(?:miles?\b|mi\b|kilometers?\b|km\b|pounds?\b|lbs?\b|kilos?\b|kg\b|tons?\b|"
    r"feet\b|foot\b|ft\b|degrees?\b|°|pallets?\b|"
    r"millas?\b|kil[oó]metros?\b|libras?\b|toneladas?\b|pies\b|grados?\b|paletas?\b|tarimas?\b)",
    re.I,
)
# "load 4471", "load number 4471", "order #1234": what precedes makes it an identifier.
ID_BEFORE = re.compile(
    r"(?:\bload|\bmc|\bdot|\border|\breference|\bref|\bpo|\bid|#|\bcarga|\borden|\breferencia|\bn[uú]mero)"
    r"(?:\s*(?:number|no\.?|#|de carga|de orden))?\s*$",
    re.I,
)


# "since 2009", "back in twenty nineteen": a year after one of these words is not a rate.
YEAR_BEFORE = re.compile(
    r"(?:\bsince|\bin|\byear|\bback in|\bdesde|\ben|\bdel|\ba[ñn]o)(?:\s+el)?\s*$", re.I
)


def _is_year(text: str, start: int, value: int) -> bool:
    return 1950 <= value <= 2099 and bool(YEAR_BEFORE.search(text[max(0, start - 12) : start]))


def _is_quantity(text: str, start: int, end: int) -> bool:
    return bool(
        UNIT_AFTER.match(text[end : end + 16]) or ID_BEFORE.search(text[max(0, start - 20) : start])
    )


def _tens(t: str | None, o: str | None) -> int:
    return (TENS[t.lower()] if t else 0) + (ONES[o.lower()] if o else 0)


def amounts_in(text: str) -> list[int]:
    """Every dollar-looking amount in the text, written or spoken, between 1,000 and 20,000.

    Quantities (a number with a unit after it, or an identifier word before it) are skipped.
    """
    found: list[int] = []
    for m in DIGITS.finditer(text):
        value = int(m.group(1).replace(",", ""))
        if not _is_quantity(text, m.start(), m.end()) and not _is_year(text, m.start(), value):
            found.append(value)
    for m in THOUSANDS.finditer(text):
        if _is_quantity(text, m.start(), m.end()):
            continue
        g = m.groupdict()
        v = ONES[g["k"].lower()] * 1000
        if g["h"]:
            v += ONES[g["h"].lower()] * 100
        v += _tens(g["t"], g["o"])
        if not _is_year(text, m.start(), v):
            found.append(v)
    for m in HUNDREDS.finditer(text):
        if _is_quantity(text, m.start(), m.end()):
            continue
        g = m.groupdict()
        head = _tens(g["t"], g["o"])
        if head < 10 or head > 99:
            continue
        if g["t3"]:
            v = head * 100 + _tens(g["t3"], g["o3"])
        elif "hundred" in m.group(0).lower():
            v = head * 100 + _tens(g["t2"], g["o2"])
        else:
            continue
        if not _is_year(text, m.start(), v):
            found.append(v)
    plain = text.translate(_ACCENTS)
    for m in SPANISH.finditer(plain):
        g = m.groupdict()
        k = g["k"].lower() if g["k"] else None
        v = 1000 if k is None else (ES_TEENS.get(k) or ES_ONES[k]) * 1000
        if g["h"]:
            v += ES_HUNDREDS[g["h"].lower()]
        if g["t"]:
            t = g["t"].lower()
            v += ES_TEENS.get(t) or ES_TENS[t]
        if g["o"]:
            v += ES_ONES[g["o"].lower()]
        if not _is_quantity(plain, m.start(), m.end()) and not _is_year(plain, m.start(), v):
            found.append(v)
    return [v for v in found if MIN_AMOUNT <= v <= MAX_AMOUNT]


_WORDS = {**{v: k for k, v in ONES.items()}, **{v: k for k, v in TEENS.items()}}


def _below_hundred(n: int) -> str:
    if n < 20:
        return _WORDS[n]
    tens, ones = divmod(n, 10)
    word = {v: k for k, v in TENS.items()}[tens * 10]
    return f"{word}-{_WORDS[ones]}" if ones else word


_ES_WORDS = {v: k for k, v in {**ES_ONES, **ES_TEENS}.items() if k not in ("un", "una", "veintiun")}
_ES_WORDS[1] = "uno"
_ES_TENS_WORDS = {v: k for k, v in ES_TENS.items()}
_ES_HUNDREDS_WORDS = {v: k for k, v in ES_HUNDREDS.items() if k != "cien"}
_ES_ACCENTED = {
    "dieciseis": "dieciséis",
    "veintidos": "veintidós",
    "veintitres": "veintitrés",
    "veintiseis": "veintiséis",
}


def _es_below_hundred(n: int) -> str:
    if n < 30:
        w = _ES_WORDS[n]
        return _ES_ACCENTED.get(w, w)
    tens, ones = divmod(n, 10)
    word = _ES_TENS_WORDS[tens * 10]
    return f"{word} y {_ES_WORDS[ones]}" if ones else word


def _say_amount_es(amount: int) -> str:
    """2,450 -> "dos mil cuatrocientos cincuenta"; 3,100 -> "tres mil cien"."""
    thousands, rest = divmod(amount, 1000)
    head = "mil" if thousands == 1 else f"{_es_below_hundred(thousands)} mil"
    if rest == 0:
        return head
    hundreds, tail = divmod(rest, 100)
    parts = [head]
    if hundreds:
        parts.append(
            "cien"
            if hundreds == 1 and tail == 0
            else "ciento"
            if hundreds == 1
            else _ES_HUNDREDS_WORDS[hundreds * 100]
        )
    if tail:
        parts.append(_es_below_hundred(tail))
    return " ".join(parts)


def say_amount(amount: int, lang: str = "en") -> str:
    """How a broker says a rate: 2,450 -> "twenty-four fifty", 2,700 -> "twenty-seven hundred".

    The LLM is told this exact phrasing so what it says matches what the guardian cleared
    and what the detector reads. Whole thousands read "three thousand"; amounts with a
    non-zero hundreds part above 1,000 use the two-by-two phone convention. In Spanish the
    rate is said in full ("dos mil cuatrocientos cincuenta").
    """
    if amount < MIN_AMOUNT or amount > 99_999:
        raise ValueError(f"not a freight rate: {amount}")
    if lang.lower().startswith("es"):
        return _say_amount_es(amount)
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
