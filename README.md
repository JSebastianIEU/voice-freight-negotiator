# Voice Freight Negotiator

> Real-time voice agent that negotiates freight rates with carriers over the phone, and can't
> be talked out of its price limits.

**Status: in progress.** Milestone 1 of 6 — see the [roadmap](docs/roadmap.md).

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

First measurement, before any tuning (milestone 1, 3 console turns, DeepSeek V3, Madrid):
end-to-end 3007–4009 ms, of which LLM time-to-first-token 1101–2976 ms. That number is what
drove the model change and the endpointing tuning; the table gets filled after milestone 3.

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
| LLM | GPT-4.1 mini (non-reasoning) | chosen on measured time-to-first-token: 705 ms vs 2153 ms for DeepSeek V3 ([report](agent/reports/llm-latency-20260924-084336.md)); reasoning = silence on a call |
| Price guardian | plain Python | limits in code; tool never reveals them; output filter as second layer |
| TTS | Cartesia Sonic | lowest time-to-first-byte |
| Models via | LiveKit Inference | one key, one spend cap, model swap in one line |
| Client | Next.js + TypeScript | call UI, live transcript, guardian events panel |
| Hosting | GCP Cloud Run | worker with min 1 instance; web scales to zero |

Full explanation, with diagrams: [docs/architecture.md](docs/architecture.md).
Why each choice: [docs/decisions/](docs/decisions/).

## Repository layout

```
agent/    Python worker: pipeline, agents, price guardian, tests              (milestone 1+)
web/      Next.js + TypeScript client                                        (milestone 1b+)
bench/    test bench: fake carrier, scenarios, reports                        (milestone 6)
deploy/   Dockerfiles and Cloud Run specs                                    (milestone 4)
docs/     architecture, roadmap, ADRs, attack catalog, article outlines
```

## Run it

Prerequisites: Python 3.12, [uv](https://docs.astral.sh/uv/), a [LiveKit Cloud](https://cloud.livekit.io) project
(free Build tier) with a **spend cap set** before the first call.

```bash
cd agent
uv sync                                   # create .venv and install everything
cp .env.example .env.local                # fill LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
uv run -m livekit.agents download-files   # once: local model weights (Silero VAD)

uv run main.py console                    # talk to the agent from the terminal
uv run main.py dev                        # join LiveKit rooms; talk from the Agents Playground
```

`make` targets wrap the same commands (`make console`, `make dev`, `make lint`, `make test`).

Every model id (STT, LLM, TTS) has a default in `agent/src/freight_negotiator/config.py` and
can be overridden in `.env.local`; swapping the LLM is one line.

Each turn appends a JSON line to `agent/metrics.jsonl` with the measured latencies
(`e2e_latency`, `llm_node_ttft`, `tts_node_ttfb`, ...). Those files feed the results table.

`make compare-llms` measures LLM time-to-first-token per model through Inference (no microphone
involved) and writes a Markdown table to `agent/reports/`; that is how the LLM choice is
justified with numbers instead of opinions.

Note: `uv run main.py console` prints a deprecation notice; LiveKit now prefers
`lk agent console` from its CLI (`brew install livekit-cli`). Both work identically.

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
