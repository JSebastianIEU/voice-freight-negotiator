# Response latency on real calls, from the deployed agent's logs

Every voice call answered by the agent on Cloud Run (europe-west1) between 2026-09-25 and
2026-10-01, from browsers in Madrid. The worker logs one line per agent turn
(`metrics.py`): `e2e` is the time from the caller's last word to Alex's first audio, the
number a caller feels; `llm ttft` is the model's time to first token and `tts ttfb` the
voice's time to first byte. All with the price desk (tools) in the loop, GPT-4.1 mini,
Deepgram Nova-3, Cartesia Sonic-3, endpointing 0.3 s / 1.2 s.

Source, reproducible with:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="agent" AND (jsonPayload.message:"turn latency" OR jsonPayload.message:"call for load")' --project voice-freight-negotiator --freshness=30d --limit 1000 --format='value(timestamp,jsonPayload.message)'
```

## All turns

| Turns | Calls | e2e median | e2e mean | e2e p90 | e2e min to max | LLM ttft median | TTS ttfb median |
|---|---|---|---|---|---|---|---|
| 41 | 6 | **1,385 ms** | 1,483 ms | 1,805 ms | 710 to 2,189 ms | 384 ms | 116 ms |

## Per call

| Started (UTC) | Room | Language | Turns | e2e median | LLM ttft median | TTS ttfb median | e2e min to max |
|---|---|---|---|---|---|---|---|
| 2026-09-25 01:58 | `not logged` | en | 9 | 1,316 ms | 330 ms | 118 ms | 843 to 1,710 ms |
| 2026-09-25 06:19 | `call-4cef02b8` | en | 0 | | | | greeting only, no reply measured |
| 2026-09-25 07:50 | `call-a805fd17` | en | 8 | 1,783 ms | 430 ms | 126 ms | 1,322 to 2,189 ms |
| 2026-09-25 14:51 | `call-f12225f2` | en | 0 | | | | greeting only, no reply measured |
| 2026-09-25 18:42 | `call-3be2695e` | en | 10 | 1,612 ms | 376 ms | 111 ms | 1,310 to 2,173 ms |
| 2026-09-25 18:49 | `call-94447d67` | en | 2 | 1,546 ms | 388 ms | 117 ms | 1,312 to 1,779 ms |
| 2026-09-25 21:08 | `call-f6068a2a` | es | 11 | 1,661 ms | 395 ms | 118 ms | 710 to 1,812 ms |
| 2026-10-01 22:18 | `call-4ed178d0` | es | 1 | 1,354 ms | 337 ms | 147 ms | 1,354 to 1,354 ms |

## Notes

- The first group of turns predates the per-call log line (`call for load ...`), so its call
  boundaries are unknown; it is shown as one row.
- The 8-turn call at 07:50 is the one used in the articles (median 1.78 s).
- A median is per turn, not per call. Each column is its own median, so LLM and TTS do not
  add up to e2e: the rest is waiting for the turn to end, the final transcript and the network.
- Few calls, one network, quiet rooms. The test bench (milestone 6) replaces this with
  hundreds of calls, noise and accents.
