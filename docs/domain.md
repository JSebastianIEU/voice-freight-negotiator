# The domain: who the agent works for, and what a call is

Read this before the prompts and the price guardian make sense.

## Three parties

| Party | Who they are | What they want |
|---|---|---|
| **Shipper** | Owns the freight: a plant, a distributor, a retailer | The load moved from A to B inside a window, reliably |
| **Carrier** | Owns the truck: an owner-operator with one tractor, or a fleet | Loads that pay well and end near the next load |
| **Broker / 3PL** | The intermediary | The spread between what the shipper pays and what the carrier is paid |

**The agent works for the broker.** In the US truckload market brokers move a large share
of freight; a mid-size brokerage answers hundreds of carrier calls a day, and most of those
calls are the same three minutes: is the load still open, what does it pay, I can do it for
X. That call is what this project automates, and the price inside it is what the guardian
protects.

## The money on one load

The broker knows three numbers the carrier never sees. The sample load in
`agent/src/freight_negotiator/loads.py` uses these:

| Number | Sample (Chicago, IL → Dallas, TX, 53' dry van, ~925 mi) | Meaning |
|---|---|---|
| Sell rate | $3,300 | what the shipper pays the broker |
| **Ceiling** (max buy) | $2,950 | the most the broker can pay a carrier and keep its minimum margin |
| **Target** | $2,700 | where the broker wants to close |
| **Floor** (opening) | $2,450 | the first offer; below this no carrier accepts and the call is wasted |

The carrier's job is to move the number up. The agent's job is to close as near the target
as it can and **never above the ceiling**: every dollar above it comes straight out of the
broker's margin. The floor is guarded for the opposite reason: offering under it is not
illegal, it is useless, the carrier hangs up and the load stays uncovered.

Rates are quoted "all-in" (line haul plus fuel), for the whole load, in US dollars. Carriers
sometimes talk per mile ("I need 3.20 a mile"): 925 miles × $3.20 = $2,960, just over the
ceiling. Unit switching is one of the attacks in the catalog for exactly that reason.

## The call, as it really goes

1. **Identify the load.** The carrier saw it on a load board (DAT, Truckstop) and names the
   lane or the load number.
2. **Qualify the carrier.** Company name, **MC number** (the federal operating authority
   every carrier must have), equipment type (dry van, reefer, flatbed), where and when the
   truck is empty. A real brokerage also checks safety and insurance; out of scope here.
3. **Present the load.** Pickup and delivery locations and windows, weight, commodity,
   anything special (tarps, liftgate, driver assist).
4. **Negotiate.** The agent opens at the floor, the carrier counters, a few rounds. A human
   broker rep does three or four; more than that and both sides are wasting time.
5. **Close.** Agreed → "I'll send the rate confirmation to your email"; not agreed → a polite
   goodbye, the load stays posted.

## What this milestone builds, on purpose

The negotiator with the three numbers **written in the prompt** and nothing else: no tools,
no code that decides. It is what anyone builds first, and it is the honest "before" the
article needs. The attack catalog (`docs/attacks/catalog.md`) then shows a competent,
polite agent give the ceiling away, because the limit and the attack live in the same place:
the model's context. Milestone 3 moves the limit out of the prompt and into code.

## Vocabulary the prompts use

- **Rate confirmation (rate con)**: the one-page contract emailed after a verbal agreement.
- **Line haul / all-in**: the base rate vs. the rate including fuel; this project quotes all-in.
- **Dry van**: the standard enclosed 53-foot trailer. **Reefer**: refrigerated. **Flatbed**: open.
- **Deadhead**: empty miles to reach the pickup; carriers price them in.
- **Load board**: the marketplace where brokers post loads and carriers find them.
