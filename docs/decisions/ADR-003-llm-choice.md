# ADR-003: LLM choice — GPT-4.1 mini by measurement, DeepSeek as the comparison

**Status:** accepted (revised 2026-09-24 after measurement) · **Date:** 2026-09-24

## Context
On a voice call every millisecond the LLM spends thinking is silence the carrier hears. The
model needs reliable tool calling (every price goes through a tool) and low time-to-first-token
(TTFT). Intelligence beyond that is not the bottleneck. Cost matters: the test bench will run
hundreds of calls.

## Original decision (superseded)
Start with DeepSeek's chat model (V3, non-reasoning) via LiveKit Inference as the default, for
cost, with the explicit condition: *"if it is not competitive on latency, the bench says so with
numbers"*. Never a reasoning variant: its thinking tokens are dead air on a call.

## What was measured
First console conversation (milestone 1, DeepSeek V3, from Madrid): end-to-end latency
4009 / 3708 / 3007 ms, of which LLM TTFT 2976 / 2810 / 1101 ms. Then `make compare-llms`
(`agent/scripts/compare_llms.py`, 3 short prompts × 3 rounds, no STT/TTS in the loop),
[full report](../../agent/reports/llm-latency-20260924-084336.md):

| Model | TTFT median | TTFT p90 | TTFT min–max |
|---|---|---|---|
| `deepseek-ai/deepseek-v3` | 2153 ms | 3562 ms | 1435–3854 ms |
| `google/gemini-2.5-flash` | 716 ms | 911 ms | 641–964 ms |
| `openai/gpt-4.1-mini` | **705 ms** | **767 ms** | 602–993 ms |
| `deepseek-ai/deepseek-v3.2` | — | — | 404 from Inference (listed in the SDK, not served) |

DeepSeek V3 through Inference starts speaking three times later than the other two, and one
turn in ten waits over 3.5 s for the LLM alone. That is above the whole latency budget for a
natural-feeling turn (see architecture, section 8).

## Decision
Default LLM is **`openai/gpt-4.1-mini`** via LiveKit Inference. Tie with Gemini 2.5 Flash on
median; chosen for the tighter p90 (767 vs 911 ms) and its track record on tool calling, which
the price guardian (milestone 3) depends on. **DeepSeek V3 stays in the project as the
comparison model** in the test bench, where its cost advantage can be weighed against its
latency with a hundred calls of data instead of nine requests.

Cost: at this project's volume (hundreds of short calls) the price difference between these
models is cents. Cost would decide only at a scale this portfolio project never reaches, and
the bench will say by how much.

## Alternatives considered
- **Keep DeepSeek and hide the latency** (filler phrases, "let me check"): rejected. It would
  mask the number the README promises to report honestly.
- **Gemini 2.5 Flash:** equivalent on median TTFT; kept one line away (`LLM_MODEL=`) and in the
  bench matrix.
- **Any reasoning model:** rejected outright for latency.
- **Speech-to-speech models:** rejected in ADR-001.

## Consequences and what to tell an enterprise client
- Swapping the model is one setting (`LLM_MODEL`); every ADR promise about "one line" held.
- **Tool-calling reliability** is measured in milestone 3 (how often the model skips
  `propose_rate`). The output filter (ADR-004) exists partly because no model is 100% here.
- **Data residency:** through LiveKit Inference, requests go to the model vendor's cloud via
  LiveKit's gateway. For an EU logistics customer this is still a conversation to have
  explicitly: which vendor, which region, which contract. The code makes the model a config
  change, so the answer can be a different model in an EU region without touching the agent.
- The lesson worth telling in an interview: the first choice was made on cost, the condition
  to revisit it was written down in advance, the measurement was cheap (one script, two
  minutes) and it overturned the choice. Decide with numbers, keep the losing option in the
  matrix.
