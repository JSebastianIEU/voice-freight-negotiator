# Roadmap

One milestone at a time, one pull request per milestone, small commits. Status is updated in
this file as PRs merge. Effort estimates are for ~10 h/week alongside studies and an internship.

| # | Milestone | Branch | Effort | Status |
|---|---|---|---|---|
| 0 | Foundations: diagrams, roadmap, ADRs | `docs/foundations` | 2 h | done |
| 1 | Voice hello world (LiveKit Agents) | `feat/m1-hello-world`, `feat/m1-latency-tuning` | 1–2 days | done |
| 1b | Web client (Next.js + TypeScript) | `feat/m1b-web-client` | 1–2 days | done |
| 1c | Visual identity: the Core | `feat/m1c-rate-lane` | 1–2 days | done |
| 2 | Negotiator with prompt-only limits, attack catalog, baseline failures | `feat/m2-negotiator` | 2–3 days | done |
| 3 | Price guardian (range, policy, tools, output filter), attacks re-run | `feat/m3-price-guardian` | 2–3 days | in review |
| 4 | Deploy to GCP (Cloud Run, Secret Manager, GitHub Actions) | `feat/m4-gcp-deploy` | 1–2 days | planned |
| 5 | Publish: README with real numbers, demo video, article 1 | `docs/publish` | 1–2 days | planned |
| 6 | Test bench: fake carrier, 100 calls, model comparison, Spanish | `feat/m6-test-bench` | 20–30 h | later |

## Definition of done per milestone

### 0 — Foundations
- [x] Architecture diagrams (Mermaid + SVG) and explanations
- [x] Roadmap and article outlines
- [x] ADRs for every stack decision
- [x] README skeleton with result placeholders (no invented numbers)

### 1 — Voice hello world
- [x] `uv run main.py console`: talk to the agent from the terminal
- [ ] `uv run main.py dev` + LiveKit Agents Playground: talk from the browser (moved to 1b, tested with the web client)
- [x] Per-turn latency (end-of-turn → first audio byte) logged as JSONL
- [x] LLM chosen on measured TTFT (`make compare-llms`, see ADR-003)
- [x] Endpointing delays tuned after the first measurement (3 s → 1.2 s max)
- [ ] LiveKit Cloud spend cap set and documented

### 1b — Web client
- [x] Next.js + TypeScript app in `web/`
- [x] `/api/token` mints a short-lived room token server-side, with explicit agent dispatch
- [x] Call button, agent state (listening / thinking / speaking), live transcript
- [x] Empty "guardian events" panel ready for milestone 3
- [x] `npm run lint && npm run build` clean
- [x] Browser conversation verified on the Mac: greeting, reply, interruption, transcript on both sides

### 1c — Visual identity: the Core
- [x] First attempt (a number line, "the rate lane") built, tested in a real call and dropped: too much metaphor to decode
- [x] Visual grammar written down (`docs/design/core.md`)
- [x] Pure particle-sphere model (phases, springs, guardian impulses) and canvas renderer, no WebGL
- [x] `/demo` scripted negotiation for previews and screenshots
- [x] Core driven by the live call: agent state, agent audio level, microphone level; pointer tilt, click ping
- [x] Guardian verdicts move the core; one call log replaces transcript + verdict panels
- [x] `prefers-reduced-motion` renders a single settled frame
- [ ] Real call on the Mac: the core follows both voices and the state label matches

### 2 — Negotiator without hard rules
- [x] Domain primer: shipper, carrier, broker; floor / target / ceiling (`docs/domain.md`)
- [x] `Load` model with a sample lane and a `PriceRange` (floor, target, ceiling)
- [x] Negotiator prompt with the limits written **in the prompt** (deliberately weak)
- [x] Attack catalog: 10 scripted pressure / injection tactics
- [x] `make attacks`: text-mode replay with a conservative detector, report + transcripts
- [x] Baseline from a real run (`docs/attacks/results-20260924-195746.md`): 0/30 crossed, 4/30 leaked, $197 of $500 margin given on average, 30 transcripts
- [ ] Voice run on the Mac of at least three attacks, transcripts in `docs/attacks/transcripts/`

### 3 — Price guardian
- [x] `guardian/range.py`: validity in pure Python, unit-tested (edges, garbage input, no bound in labels)
- [x] `guardian/policy.py`: concession ladder, "move only when the carrier moves", booking rule; the ten attacks as policy traces in tests
- [x] `propose_rate` / `accept_rate` tools; replies carry one figure and its spoken form, never the range; per-mile converted in code
- [x] Prompt no longer contains any number (test flipped); milestone 2 agent kept as `AGENT_PROFILE=prompt-only`
- [x] Output filter replaces sentences with unvalidated amounts before TTS, streamed, unit-tested
- [x] Guardian verdicts published on the data channel; the Core and the call log react
- [x] `make attacks` / `make attacks-baseline`: same catalog, both agents, tool calls in transcripts, turn timing
- [x] Attack catalog re-run with the guardian (`results-20260924-205831-guardian.md`): 0/30 crossed, 0/30 leaked, $112 of $500 given on average, one filter block in 180 turns
- [x] Turn-time difference guardian vs prompt-only in the README: +94 ms median, +367 ms mean (58 tool calls in 180 turns)
- [ ] Real call on the Mac: verdicts appear in the call log and move the Core

### 4 — Deploy to GCP
- [ ] Container images for agent and web
- [ ] CI: ruff, unit tests, `next build` on every PR
- [ ] Cloud Run: web (scale to zero) and agent worker (min 1 instance, CPU always on)
- [ ] Secrets in Secret Manager, deploy via Workload Identity Federation
- [ ] Billing budget alert
- [ ] Public demo URL works from a phone browser

### 5 — Publish
- [ ] README: measured numbers, demo video, live link, cost per call
- [ ] Article 1 published on Medium
- [ ] HappyRobot contacted with the repo and the article

### 6 — Test bench
- [ ] Fake carrier agent (cheap voice, persona: mood, accent, script)
- [ ] Scenario runner: N calls × personas × background noise
- [ ] Report: latency, number-transcription errors, out-of-range prices, mid-number interruptions
- [ ] LLM comparison: DeepSeek vs a fast Western model on TTFT, tool reliability, cost
- [ ] Spanish mode
- [ ] Article 2 published
- [ ] Twilio SIP number attached to the deployed worker

## Rules that apply to every milestone
- Numbers in the README come from a run recorded in `docs/attacks/` or `bench/reports/`. Placeholders stay `[X]` until then.
- Every stack choice gets an ADR in `docs/decisions/` before or with the code that uses it.
- Spend caps on LiveKit Cloud and a GCP budget alert before the first paid call.
