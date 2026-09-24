# Voice Freight Negotiator

> Real-time voice agent that negotiates freight rates with carriers over the phone, and can't
> be talked out of its price limits.

**Status: in progress.** Milestone 0 of 6 — see the [roadmap](docs/roadmap.md).

A carrier calls to offer a load. The agent negotiates the rate inside a range (minimum and
maximum) and never goes outside it, no matter how much pressure, fake urgency or prompt
injection the carrier uses.

**The LLM negotiates. The code decides.** Every price the agent wants to offer or accept goes
through a tool; the limits live in Python, not in the prompt; a second filter blocks any
unvalidated amount before it is spoken.

![System architecture](docs/diagrams/01-system-architecture.svg)

## Results

Placeholders until the runs in [`docs/attacks/`](docs/attacks/) and `bench/reports/` exist.
No number below is invented.

| Metric | Without guardian | With guardian |
|---|---|---|
| Out-of-range prices accepted (adversarial attempts) | `[X]` of `[N]` | `[X]` of `[N]` |
| Average response latency, end of turn → first audio | `[X]` ms | `[X]` ms |
| Extra latency per validated price (tool round trip) | — | `[X]` ms |

## How it works

```
carrier audio → VAD → STT → turn detection → LLM (+ price guardian tools) → output filter → TTS → agent audio
```

| Piece | Choice | One-line why |
|---|---|---|
| Transport | LiveKit Cloud, WebRTC | UDP: a lost packet costs 20 ms of audio, not a stall |
| Framework | LiveKit Agents (Python) | pipeline, interruptions, turn detector, test framework, SIP later |
| VAD | Silero | "is someone speaking?" — cheap, local, powers interruptions |
| STT | Deepgram Nova-3 | streaming partials, good with numbers |
| Turn detection | LiveKit turn-detector model | "did they finish, or pause mid-number?" |
| LLM | DeepSeek chat (non-reasoning) | small, fast, cheap; reasoning = silence on a call |
| Price guardian | plain Python | limits in code; tool never reveals them; output filter as second layer |
| TTS | Cartesia Sonic | lowest time-to-first-byte |
| Models via | LiveKit Inference | one key, one spend cap, model swap in one line |
| Client | Next.js + TypeScript | call UI, live transcript, guardian events panel |
| Hosting | GCP Cloud Run | worker with min 1 instance; web scales to zero |

Full explanation, with diagrams: [docs/architecture.md](docs/architecture.md).
Why each choice: [docs/decisions/](docs/decisions/).

## Repository layout

```
agent/    Python worker: pipeline, negotiator agent, price guardian, tests   (milestone 1+)
web/      Next.js + TypeScript client                                        (milestone 1b+)
bench/    test bench: fake carrier, scenarios, reports                        (milestone 6)
deploy/   Dockerfiles and Cloud Run specs                                    (milestone 4)
docs/     architecture, roadmap, ADRs, attack catalog, article outlines
```

## Run it

Coming with milestone 1. It will be:

```bash
cd agent
uv sync
cp .env.example .env.local   # LiveKit Cloud URL, key, secret
uv run main.py download-files
uv run main.py console        # talk from the terminal
uv run main.py dev            # join LiveKit rooms; open the web client or the Playground
```

## Cost

Every external service has a spending limit before the first paid call:

- **LiveKit Cloud:** free Build tier for rooms; STT/LLM/TTS billed through LiveKit Inference
  under one spend cap.
- **GCP:** billing budget alert; the only fixed cost is the always-on agent worker on Cloud Run.

Measured cost per call: `[X]` (filled by the test bench).

## Articles

1. *How to stop an AI agent from giving away your money in a negotiation* — after milestone 5.
2. *I tested my voice agent with 100 calls: here's what broke* — after milestone 6.

Outlines in [docs/articles/outline.md](docs/articles/outline.md).

## License

MIT — Juan Sebastián Peña Donneys, 2026.
