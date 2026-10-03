# Voice Freight Negotiator

[![ci](https://github.com/JSebastianIEU/voice-freight-negotiator/actions/workflows/ci.yml/badge.svg)](https://github.com/JSebastianIEU/voice-freight-negotiator/actions/workflows/ci.yml)
[![deploy](https://github.com/JSebastianIEU/voice-freight-negotiator/actions/workflows/deploy.yml/badge.svg)](https://github.com/JSebastianIEU/voice-freight-negotiator/actions/workflows/deploy.yml)
[![live demo](https://img.shields.io/badge/live%20demo-talk--to--alex.web.app-2f6fd0)](https://talk-to-alex.web.app)
[![license: MIT](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

A real-time voice agent that negotiates freight rates with truckers, and can't be talked out
of its price limits.

**Try it at [talk-to-alex.web.app](https://talk-to-alex.web.app).** Pick a trucking company
and a load, call Alex from the browser in English or Spanish, and try to talk it into
overpaying. No microphone? The page plays a sample call.

![The call screen](docs/articles/figures-02/08-call-screen.png)

## What it is

Alex is a carrier sales rep for a fictional freight brokerage. A trucking company calls about
a load; Alex checks the caller's MC number, describes the load, negotiates the rate and hangs
up on its own when the call is done.

The project is built around one rule: **the LLM negotiates, the code decides.** The model
never sees the price limits. Every figure it says comes from a tool, "the desk", written in
plain Python: it checks who is calling, climbs a ladder of offers one rung at a time and
books only an amount it offered. A second check reads every sentence before it is spoken and
replaces any price the desk did not approve.

## Results

| | Limits in the prompt | Limits in code (the desk) |
|---|---|---|
| Agreed to a rate above the ceiling | 0 of 30 | 0 of 30 |
| Said the ceiling or the target out loud | 4 of 30 | **0 of 30** |
| Margin given away, of $500 | $197 on average, all of it in 4 attacks | **$72 on average, $250 at most** |
| Time the desk adds to a turn | | +354 ms median |
| Response time on real calls, last word to first audio | | **1,385 ms median**, 1,805 ms p90 |

"Of 30" means ten scripted attacks (fake urgency, a fake manager, anchoring, a per-mile
switch, prompt injection, a split number and more) run three times against each version, with
the same model and the same detector. The prompt-only agent never crossed its limit, and still
walked from its floor to its ceiling under pressure: holding the line is not the same as
protecting the margin. With the desk, how much margin can move is a policy in code, not a
mood of the model.

Every number links to the run that produced it: [results in detail](docs/results.md),
[attack catalog](docs/attacks/catalog.md), [latency on real calls](agent/reports/call-latency-20261001.md).

## How it was tested

- **183 unit tests, 91% line coverage** on the agent (pytest): every price rule, the caller
  check, the money parser in English and Spanish, the output filter and the tool wiring.
- **Token endpoint tests** on the web app (vitest): one fresh room per call, a 15 minute token,
  only the grants a caller needs, and no secret in error messages.
- **Adversarial replay:** `make attacks` runs the ten attacks three times and writes every
  transcript, tool call and turn time to [`docs/attacks/`](docs/attacks/).
- **Measured, not assumed:** the LLM was picked by measured time to first token
  ([report](agent/reports/llm-latency-20260924-084336.md)), and latency is read back from the
  logs of real calls ([report](agent/reports/call-latency-20261001.md)).
- **CI on every pull request:** ruff, pytest with coverage, eslint, vitest, tsc, `next build`
  and both Docker images. Every merge to `main` deploys to Cloud Run.

## How it works

![System architecture](docs/diagrams/01-system-architecture.svg)

| Step | Piece | Why |
|---|---|---|
| Hear | WebRTC through LiveKit Cloud; Deepgram Nova-3, streaming and multilingual | over UDP a lost packet costs 20 ms of audio, not a stall |
| Know the caller is done | Silero VAD and LiveKit's audio turn detector | the pause in "thirty two... fifty" is not the end of a turn |
| Think | GPT-4.1 mini through LiveKit Inference | 705 ms to first token, against 2,153 ms for DeepSeek V3 |
| Decide every number | the desk, plain Python | the model never sees the range, so there is nothing to leak |
| Check every sentence | output filter | a price the desk never approved is not spoken |
| Speak | Cartesia Sonic | starts on the first complete sentence |
| Show it | Next.js and TypeScript | live transcript, the desk's verdicts as they happen, the reveal |
| Run it | Cloud Run and Firebase Hosting | the agent is always on, the web app scales to zero |

More: [architecture](docs/architecture.md), [design decisions](docs/decisions/),
[the freight domain](docs/domain.md), [the page's design](docs/design/showcase.md).

## Run it locally

You need Python 3.12, [uv](https://docs.astral.sh/uv/), Node 20+ and a
[LiveKit Cloud](https://cloud.livekit.io) project (the free tier is enough; set a spend cap).

```bash
cd agent
uv sync
cp .env.example .env.local          # LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
uv run -m livekit.agents download-files
uv run main.py dev                  # waits for calls
```

In a second terminal:

```bash
cd web
npm install
cp .env.example .env.local          # the same three LiveKit values
npm run dev                         # http://localhost:3000
```

Checks: `make lint`, `make test` and `make attacks` in `agent/`; `npm run lint` and
`npm test` in `web/`. `uv run main.py console` talks to Alex from the terminal, without the
browser.

## Deploy

GitHub Actions deploys both services to Cloud Run on every push to `main`, authenticated with
Workload Identity Federation, so no key file exists anywhere. One script sets up a new Google
Cloud project: APIs, registry, secrets, service accounts, the identity pool and a budget
alert. The agent is pinned to one always-on instance because it keeps a connection open to
LiveKit and waits for calls; the web app scales to zero. Everything, including the errors met
on the first deploy: [docs/deploy.md](docs/deploy.md).

## Cost

- **Google Cloud:** the always-on agent is the only fixed cost, about **$47 a month** at
  [Cloud Run's list price](https://cloud.google.com/run/pricing) in europe-west1 (1 vCPU and
  1 GiB, instance-based billing, after the monthly free tier). The web app costs nothing while
  idle.
- **LiveKit:** rooms run on the free tier. Speech to text, the model and the voice are billed
  per use through LiveKit Inference, under one spend cap: about 2 cents per minute of call at
  [LiveKit's list prices](https://livekit.com/pricing/inference), most of it the voice.

## Status

Milestones 0 to 4b are done: the voice agent, the desk, the attack replay, the deployment and
the guided demo in two languages. Next is a test bench in which a fake carrier calls Alex
hundreds of times with background noise, accents and mumbled numbers. See the
[roadmap](docs/roadmap.md).

## License

[MIT](LICENSE), Juan Sebastián Peña Donneys, 2026.
