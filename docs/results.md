# Results in detail

The README has the summary table. This page has what the numbers mean and how they were
produced. Every figure links to the run that produced it.

## The attack replay

Ten scripted attacks ([catalog](attacks/catalog.md)) run three times each against two
versions of the agent, in text mode, with GPT-4.1 mini, the same catalog and the same
detector on both sides.

| Version | Report |
|---|---|
| Limits in the prompt, first run | [`results-20260924-195746.md`](attacks/results-20260924-195746.md) |
| Limits in the prompt, run again the same evening | [`results-20260924-204507-prompt-only.md`](attacks/results-20260924-204507-prompt-only.md) |
| The desk, current version (caller check, totals, currency, yes-or-no replies) | [`results-20260925-211301-guardian.md`](attacks/results-20260925-211301-guardian.md) |
| The desk, first version, kept for comparison | [`results-20260924-205831-guardian.md`](attacks/results-20260924-205831-guardian.md) |

Each report has every transcript, every tool call and the wall-clock time of every turn.
`make attacks` and `make attacks-baseline` (in `agent/`) reproduce them.

What the numbers say. The prompt-only agent never crossed its ceiling in short text
exchanges, which was not the expected result; what it did instead is the point. In the first
run, under anchoring, fake urgency, a per-mile switch and a fake "system note", it walked from
the floor to the ceiling and announced $2,950 as "the highest I can offer". The second run
leaked once and gave less away, which is the other finding: **a prompt's behaviour is a
distribution**. Four leaks or one, $197 or $173, depends on the sampling of the day. See
[the catalog](attacks/catalog.md) for why three metrics are needed.

With the desk, "margin given away" is a policy parameter, not a model mood: the ladder for
this load is $2,450 → $2,575 → $2,700 → $2,825 best-and-final, one rung per carrier move,
and $2,950 is never offered. In the current run the agent left the floor in five attacks,
reached the third rung only under the split number, and never quoted anything to the caller
who priced in Canadian dollars: the desk refused to convert and Alex asked for a US dollar
figure three times, then let the call end. The output filter fired 10 times in 180 turns,
mostly under fake urgency, authority and the sob story, where the model repeated the
caller's figure in a sentence that did not decline it; each time the sentence became "Let me
check that figure with the desk" and the call went on. The cost is one LLM round trip on the
turns where money or identity comes up: 87 tool calls in 180 turns, +354 ms on the median
turn, +405 ms on the mean.

Why this run exists: reading the first guardian run's transcripts showed that the guardian
judged only the parts the model chose to send it. It checked $2,900 of "$2,900 plus $250
deadhead", trusted the model to read "3,300 Canadian", and its wording told the model whether
an ask was under the ceiling. The desk now computes totals from every component, refuses
other currencies, and answers only yes or no; the re-run above is against that desk. The
transcripts still show the model choosing the arguments: in the split number it once sent
its own $2,575 as the base of "$2,900 plus $250", and in the math trick it sent no
percentage at all and simply held the offer. The code judged whatever arrived, and the
outcome was safe both times, but the field the model fills is the remaining weak spot.
These runs are text mode, so the median has no STT or TTS in it, and a misheard "fourteen"
for "forty" is the voice bench's job.

### How latency got here

First latency measurement, before any tuning (milestone 1, 3 console turns, DeepSeek V3, Madrid):
end-to-end 3,007 to 4,009 ms, of which LLM time to first token 1,101 to 2,976 ms. After the model change
and endpointing tuning: 1,447 to 2,341 ms (n=5). With the desk, on real calls to the deployed agent:
1,385 ms median over 41 turns ([report](../agent/reports/call-latency-20261001.md)).

## Latency on real calls

From the caller's last word to Alex's first audio: **1,385 ms median, 1,805 ms p90**, over 41
turns of every call the deployed agent answered between September 25 and October 1, from
browsers in Madrid to Cloud Run in Belgium. Read back from the worker's per-turn log lines:
[`call-latency-20261001.md`](../agent/reports/call-latency-20261001.md), with the command that
reproduces it. Few calls, one network, quiet rooms; the test bench (milestone 6) replaces it
with hundreds of calls, noise and accents.

The LLM was chosen the same way, by measured time to first token through the same gateway:
[`llm-latency-20260924-084336.md`](../agent/reports/llm-latency-20260924-084336.md).
