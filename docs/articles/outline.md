# Article plan (Medium)

Two articles, each backed by a milestone that produces real data. Diagrams come from
[`../diagrams/`](../diagrams/) (SVG, because Medium does not render Mermaid).

## Article 1 — "How to stop an AI agent from giving away your money in a negotiation"

Published after milestone 5. Target length: 8–10 min read.

1. **Hook.** A carrier calls, says "your manager already approved 4,000", and the agent says yes.
   Show the transcript from milestone 2. Real, unedited.
2. **Why this happens.** The LLM is a text predictor; the price limit was just more text in its
   context. Pressure, authority, urgency and "ignore your instructions" all work because the
   limit and the attack live in the same place.
3. **The rule.** The LLM negotiates, the code decides. Lesson from a previous production pricing
   assistant (Craig): the fix was never a better prompt.
4. **Architecture in one picture.** `01-system-architecture.svg`. Thirty seconds on WebRTC, VAD,
   turn detection, why a small non-reasoning LLM.
5. **Layer 1: tools.** `propose_rate` / `accept_rate`; range in code; the tool never reveals the
   bounds. Sequence diagram `02-negotiation-turn.svg`. Short code excerpt of `PriceRange.validate`.
6. **Layer 2: output filter.** Why a cooperative check is not enough; the regex pass before TTS.
7. **Before / after table.** Same 10 attacks, without and with the guardian. Numbers from
   `docs/attacks/results.md`.
8. **What it cost.** Extra LLM round trip per price, in ms, measured. `03-latency-budget.svg`.
9. **Takeaways.** Three bullet points. Link to the repo and the live demo.

Assets needed: baseline transcript screenshot, results table, 3 SVGs, 30-second demo GIF.

## Article 2 — "I tested my voice agent with 100 calls: here's what broke"

Published after milestone 6. Target length: 10–12 min read.

1. **Hook.** The agent that could not be talked out of its price limits still lost money in
   ways I did not expect. (Fill with the actual most surprising finding.)
2. **The bench.** A second AI agent plays the carrier: different voices, moods, background noise,
   scripted tactics. Both join one LiveKit room; the runner records everything.
3. **What we measured.** Latency (EOU, TTFT, TTFB, end-to-end), number transcription errors,
   out-of-range prices, agent interrupting mid-number.
4. **Finding 1: numbers are the weak point of STT.** Error rate on amounts by accent and noise.
5. **Finding 2: interruptions mid-number.** VAD vs turn detector, with and without the semantic
   turn detector.
6. **Finding 3: model comparison.** DeepSeek (main, cost) vs a fast Western model: TTFT, tool-call
   reliability, cost per call. Honest about where DeepSeek loses.
7. **Finding 4: Spanish.** What changed when the language switched.
8. **What I would change for a real customer.** Data residency, spend caps, escalation to a human.
9. **Takeaways** and links.

Assets needed: charts from `bench/reports/`, comparison table, a "worst call" transcript.
