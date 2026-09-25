# ADR-007: Verify the caller in code before any rate

**Status:** accepted · **Date:** 2026-09-25

## Context
After the first public deploy, visitors noticed that Alex greeted anyone with the lane and
quoted a rate without knowing who was on the line. A real broker never does that. Before a
rate is discussed, the carrier's MC number is looked up (in the US, FMCSA operating
authority): an unknown number, a revoked authority or a name that does not match the record
means no load, because booking such a carrier is how double-brokering fraud and uninsured
cargo happen.

The same gap made the demo hard to play. The visitor had no identity to present, and the
attack catalog had nothing to say about pretending to be someone else, which is one of the
oldest tricks on a freight call.

Milestone 3 already answered the price question in code (ADR-004). Leaving identity to the
prompt ("ask for the MC first") would reintroduce the failure that ADR-004 was written
against: a caller who insists gets an answer.

## Decision
The pricing desk (`agent/src/freight_negotiator/guardian/desk.py`) becomes the only thing the
model can ask during a call. It answers four questions and owns three rules.

**Four tools:**
- `verify_carrier(mc_number, company_name)`: the MC number is looked up in a carrier
  directory (`carriers.py`, records shaped like an FMCSA lookup: company, MC, authority
  status, equipment, fleet size, base, contact).
  - An unknown number gets one retry ("repeat it digit by digit"), then the call ends politely.
  - An inactive authority is refused.
  - A company name that does not match the record is refused until the caller confirms the
    registered name. The match is lenient ("Redline" matches "Redline Transport LLC"), but
    generic words alone ("Transport", "Logistics") never match.
- `find_loads(load_id, origin, destination, equipment)`: public details only, never a rate.
  Loads the verified carrier can haul come first.
- `propose_rate` and `accept_rate`: the ladder and the booking rule of ADR-004, now with one
  negotiation per load, so moving to another load and back never restarts a ladder.

**Three rules, enforced in the tools and only repeated by the prompt:**
1. No rate is quoted, discussed or booked before `verify_carrier` succeeds. Until then the
   price tools answer "not yet: the caller is not verified", and nothing else.
2. No rate is quoted or booked on a load the carrier's equipment cannot haul. A reefer may
   run dry van freight; nothing else substitutes.
3. No reply contains a floor, target or ceiling of any load (unchanged).

**Every decision is published** on the data channel: `carrier.verified` and
`carrier.rejected` (MC, company, reason), `load.focus` when the call moves to another load,
and the `rate.*` events, which now carry their load id. The web client draws the call from
these receipts.

**The output filter learns one distinction.** An amount the caller asked for may be spoken
only in a sentence that declines it ("I can't do thirty-four hundred"). A sentence that
agrees to it, or confirms it, is still replaced before speech. Before this, Alex could not
name the figure it was refusing and sounded evasive; now it can, without opening a path to
"confirmed at thirty-four hundred".

## Alternatives considered
- **Identity in the prompt.** Same failure mode as prices in the prompt: the model is asked
  to behave, and a persistent caller can talk it out of it.
- **The real FMCSA API.** Real data, and the right production answer. Not used here: the
  demo would depend on a government API's uptime and a web key in the worker, and visitors
  would be role-playing real companies. The directory has the same shape, so the swap is one
  class.
- **Identity from the web client** (the visitor picks a carrier and the browser sends its
  MC as dispatch metadata). This trusts the client, and it skips the point, which is that the
  agent checks what it hears on the call. The browser sends only the load the visitor clicked.
- **Never repeat a caller's number.** One notch safer. It also makes every refusal sound like
  a script ("I can't do that figure"). The declinable rule keeps the filter strict where it
  matters, agreement, and natural where it is harmless, a refusal.

## Consequences
- Every call has an identity step before money, which is one more tool round trip per call,
  paid once, before the first rate.
- The attack runs in `docs/attacks/` were recorded against the milestone 3 desk. The replay
  script's opening already identifies as Redline Transport, MC 884-2210, so `make attacks`
  exercises the same price rules after verification. The published numbers should be re-run
  before they are quoted for this version.
- **Known limit:** identity is checked against the directory, not against the phone line. A
  caller who knows another active carrier's MC number and exact name passes, just as with a
  broker who skips the callback. Prices do not depend on who is calling, so a borrowed
  identity cannot buy a better rate. It can only get a truck booked under someone else's
  name. The production fix is a callback to the phone number on file, and it is future work.
- The directory lives in `catalog.json` next to the loads. The web client ships a copy, and
  an agent test fails when the two drift. It includes one inactive carrier (MC 555-0199) and
  one that visitors cannot pick, so the refusal paths can be exercised on a live call.
