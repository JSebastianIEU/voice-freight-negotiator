"""The catalog is one file with two copies: the agent's and the web client's."""

import json
from pathlib import Path

import pytest

from freight_negotiator.loads import CATALOG, CATALOG_PATH, SAMPLE_LOAD, find_load, read_catalog

WEB_COPY = Path(__file__).resolve().parents[2] / "web" / "data" / "catalog.json"


def test_every_load_parses_and_has_a_sane_range() -> None:
    assert len(CATALOG) >= 5
    for load in CATALOG.values():
        assert 0 < load.prices.floor < load.prices.ceiling < load.sell_rate
        assert load.miles > 0 and load.weight_lbs > 0
        assert load.load_id in load.brief() and str(load.prices.ceiling) not in load.brief()


def test_sample_load_is_the_chicago_dallas_lane() -> None:
    assert SAMPLE_LOAD.load_id == "CHI-DAL-4471"
    assert SAMPLE_LOAD.prices.ceiling == 2_950


def test_find_load_falls_back_to_the_sample() -> None:
    assert find_load("LRD-ATL-2208").load_id == "LRD-ATL-2208"
    assert find_load("nope") is SAMPLE_LOAD
    assert find_load(None) is SAMPLE_LOAD


def test_carriers_have_what_alex_asks_for() -> None:
    for c in read_catalog()["carriers"]:
        assert c["company"] and c["mc"] and c["equipment"] and c["base"]["city"]
        assert set(c["persona"]) == {"en", "es"}


def test_bilingual_fields_are_complete() -> None:
    for d in read_catalog()["loads"]:
        assert set(d["commodity"]) == {"en", "es"} and set(d["notes"]) == {"en", "es"}


@pytest.mark.skipif(not WEB_COPY.exists(), reason="web copy not present in this checkout")
def test_web_copy_matches_the_source() -> None:
    # Byte-for-byte; `make sync-catalog` refreshes the copy.
    assert json.loads(WEB_COPY.read_text()) == json.loads(CATALOG_PATH.read_text()), (
        "web/data/catalog.json is out of date: run `make sync-catalog` in agent/"
    )
