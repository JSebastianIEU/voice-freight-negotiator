# Roadmap

One milestone at a time, one pull request per milestone, small commits. Status is updated in
this file as PRs merge. Effort estimates are for ~10 h/week alongside studies and an internship.

| # | Milestone | Branch | Effort | Status |
|---|---|---|---|---|
| 0 | Foundations: diagrams, roadmap, ADRs | `docs/foundations` | 2 h | in review |
| 1 | Voice hello world (LiveKit Agents) | `feat/m1-hello-world` | 1–2 days | planned |
| 1b | Web client (Next.js + TypeScript) | `feat/m1b-web-client` | 1–2 days | planned |
| 2 | Negotiator with prompt-only limits, attack catalog, baseline failures | `feat/m2-negotiator` | 2–3 days | planned |
| 3 | Price guardian (tools + output filter), attacks re-run | `feat/m3-price-guardian` | 2–3 days | planned |
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
- [ ] `uv run main.py console`: talk to the agent from the terminal
- [ ] `uv run main.py dev` + LiveKit Agents Playground: talk from the browser
- [ ] Interrupting the agent mid-sentence works
- [ ] Per-turn latency (end-of-turn → first audio byte) logged as JSONL
- [ ] LiveKit Cloud spend cap set and documented

### 1b — Web client
- [ ] Next.js + TypeScript app in `web/`
- [ ] `/api/token` mints a short-lived room token server-side
- [ ] Call button, agent state (listening / thinking / speaking), live transcript
- [ ] Empty "guardian events" panel ready for milestone 3
- [ ] `npm run lint && npm run build` clean

### 2 — Negotiator without hard rules
- [ ] `Load` model with a sample lane and a `PriceRange`
- [ ] Negotiator prompt with the limits written **in the prompt** (deliberately weak)
- [ ] Attack catalog: ~10 scripted pressure / injection tactics
- [ ] Baseline table: out-of-range prices accepted, N of M attempts, with transcripts

### 3 — Price guardian
- [ ] `PriceRange.validate()` pure Python, unit-tested
- [ ] `propose_rate` / `accept_rate` tools; tool output never reveals the range
- [ ] Prompt no longer contains any number; every price goes through a tool
- [ ] Output filter blocks unvalidated amounts before TTS
- [ ] Attack catalog re-run: table "after" column
- [ ] Latency cost of the tool round trip measured
- [ ] Web client shows guardian verdicts live

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
