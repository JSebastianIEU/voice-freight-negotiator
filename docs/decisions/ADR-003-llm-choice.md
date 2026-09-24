# ADR-003: DeepSeek chat as the main LLM

**Status:** accepted · **Date:** 2026-09-24

## Context
On a voice call every millisecond the LLM spends thinking is silence the carrier hears. The
model needs reliable tool calling (every price goes through a tool) and low time-to-first-token.
Intelligence beyond that is not the bottleneck. Cost matters: the test bench will run hundreds
of calls.

## Decision
Use DeepSeek's **chat** model (V3 family, non-reasoning) via LiveKit Inference as the default
LLM, for cost. The exact model id is recorded in `config.py` when milestone 1 lands.
Never the reasoning variant (R1-style): its thinking tokens are dead air on a call.

## Alternatives considered
- **`openai/gpt-4.1-mini` or `google/gemini-2.5-flash`:** the "safe" fast tool-calling options.
  Kept as one-line fallbacks and as the comparison models in the bench.
- **Any reasoning model:** rejected outright for latency.
- **Speech-to-speech models:** rejected in ADR-001.

## Consequences and what to tell an enterprise client
- **Latency:** DeepSeek's TTFT through Inference is measured in milestone 1 and compared in
  milestone 6. If it is not competitive, the bench says so with numbers.
- **Tool-calling reliability:** measured in milestone 3 (how often the model skips
  `propose_rate`). The output filter (ADR-004) exists partly because no model is 100% here.
- **Data residency:** through LiveKit Inference the requests go to a US inference partner, not
  to DeepSeek's own API in China. For an EU logistics customer this is still a conversation to
  have explicitly: which vendor, which region, which contract. The honest answer for such a
  client is often a different model in an EU region; the code makes that a one-line change.
- The main-model choice is a cost decision for a portfolio project, and the ADR says so.
