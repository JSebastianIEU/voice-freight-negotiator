# The showcase: making the negotiation legible

After the first public deploy the honest feedback was: *"I talked to it, but I did not
understand what Alex does, why it knew the load, or what I was supposed to say."* The
agent was fine; the page gave the visitor no role, no data and no ending. This is the
design that fixed it.

## The visitor is the carrier, and the page says so

The screen is a small game with real money on the line:

1. **Briefing.** Who you are (a carrier with an empty truck), who Alex is (the broker's AI
   rep), what Alex has (a load and a secret ceiling), what you want (the highest rate) and
   what Alex must never do (cross the ceiling, say it). Three steps: pick who you are, pick
   a posting, talk. The core sits above it, idle, so the identity of the project is on
   screen from the first second.
2. **Setup.** *Who you are*: four carrier personas with the exact things a broker asks for
   (company, MC number, equipment, where the truck is empty, driver). *The posting*: a load
   board with six lanes shown the way DAT or Truckstop show them, public data only, "call
   for rate" where the price would be. Picking a posting is how a carrier picks a call;
   that is why Alex greets you with the lane. Nothing about the carrier travels to the
   agent: Alex asks, you read your card.
3. **The call.** Left, the core. Right: the state line, hang up, five dots for the steps of
   a broker call (identify → qualify → read the load → negotiate → close), your card, the
   moves and the log. The **moves** are the attack catalog as cards: the tactic explained
   in your language, the line to say always in English, with the numbers filled from the
   load so they land above the ceiling. The **steps** are read off the guardian's events
   for the last two and off simple English cues in the transcript for the first three.
4. **Debrief.** The reveal: Alex's opening offer, target and ceiling next to where you
   closed (or Alex's highest offer), the margin Alex kept, the asks the guardian rejected
   and the sentences the output filter replaced. Every number comes from events the worker
   published during the call; nothing is inferred from the transcript.

## Two languages, one agent

The page is English or Spanish (toggle in the header, remembered per browser, defaulting
to the browser language). Alex speaks English: the market is the US truckload market and
the attack detector reads English. So every line the visitor is meant to *say* stays in
English in both languages, and everything meant to be *understood* switches. A Spanish
Alex is milestone 6 work (multilingual STT, a second prompt, a voice).

## One catalog

`agent/src/freight_negotiator/data/catalog.json` holds the broker, the six loads (with
English and Spanish commodity and notes) and the four carriers. The agent reads it; the
web client ships a byte-for-byte copy (`web/data/catalog.json`, refreshed by
`make sync-catalog`) and an agent test fails when the two drift. The private numbers are
in the copy too, on purpose: the claim of this project is that the *model* never sees
them, not that a curious visitor cannot. The debrief shows them.

## What is deliberately not there

- No score, no leaderboard, no timer. The point is to feel the wall, not to win.
- No hint from Alex about the moves. The cards are the visitor's, not the agent's.
- No per-carrier behaviour in the agent. The personas are for the visitor's role-play;
  Alex treats every caller the same, which is what a fair rep does.
