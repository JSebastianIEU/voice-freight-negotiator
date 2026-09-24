"""Measure LLM time-to-first-token through LiveKit Inference, model by model.

Why this exists: on a voice call the LLM's time to first token (TTFT) is the
largest and most variable block of the latency budget. This script isolates it,
no microphone, STT or TTS involved, so models can be compared on the one number
that matters most for how the call *feels*.

Run from ``agent/`` with ``.env.local`` filled in::

    uv run scripts/compare_llms.py
    uv run scripts/compare_llms.py --models deepseek-ai/deepseek-v3 openai/gpt-4.1-mini --rounds 5

It prints a Markdown table and writes ``reports/llm-latency-<timestamp>.md`` and
``.json`` next to it, so the numbers can be pasted into the ADR untouched.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import inference, llm

DEFAULT_MODELS = [
    "deepseek-ai/deepseek-v3",
    "deepseek-ai/deepseek-v3.2",
    "google/gemini-2.5-flash",
    "openai/gpt-4.1-mini",
]

SYSTEM_PROMPT = "You are a voice assistant. Reply in one short sentence, no lists, no markdown."

# Short, conversational turns: what a carrier actually says on a call.
PROMPTS = [
    "Hello, how are you doing today?",
    "I've got a dry van load from Chicago to Dallas, what can you pay?",
    "Can you do thirty-two fifty on that?",
]


async def measure_once(model_id: str, prompt: str, temperature: float) -> dict[str, float]:
    """One request: returns time to first content token and total duration, in seconds."""
    model = inference.LLM(model=model_id, extra_kwargs={"temperature": temperature})
    ctx = llm.ChatContext()
    ctx.add_message(role="system", content=SYSTEM_PROMPT)
    ctx.add_message(role="user", content=prompt)

    started = time.perf_counter()
    ttft: float | None = None
    text = ""
    try:
        async with model.chat(chat_ctx=ctx) as stream:
            async for chunk in stream:
                if chunk.delta and chunk.delta.content:
                    if ttft is None:
                        ttft = time.perf_counter() - started
                    text += chunk.delta.content
    finally:
        await model.aclose()
    total = time.perf_counter() - started
    if ttft is None:  # model answered with no content at all
        ttft = total
    return {"ttft": ttft, "total": total, "chars": float(len(text))}


async def measure_model(model_id: str, rounds: int, temperature: float) -> dict[str, object]:
    samples: list[dict[str, float]] = []
    errors: list[str] = []
    for _ in range(rounds):
        for prompt in PROMPTS:
            try:
                samples.append(await measure_once(model_id, prompt, temperature))
            except Exception as exc:  # noqa: BLE001 - we want the table, not a crash
                errors.append(f"{type(exc).__name__}: {exc}")
    ttfts = [s["ttft"] for s in samples]
    totals = [s["total"] for s in samples]
    return {
        "model": model_id,
        "n": len(samples),
        "errors": errors,
        "ttft_median_ms": round(statistics.median(ttfts) * 1000) if ttfts else None,
        "ttft_p90_ms": round(sorted(ttfts)[max(0, int(len(ttfts) * 0.9) - 1)] * 1000)
        if ttfts
        else None,
        "ttft_min_ms": round(min(ttfts) * 1000) if ttfts else None,
        "ttft_max_ms": round(max(ttfts) * 1000) if ttfts else None,
        "total_median_ms": round(statistics.median(totals) * 1000) if totals else None,
        "samples": samples,
    }


def render_table(results: list[dict[str, object]]) -> str:
    lines = [
        "| Model | n | TTFT median | TTFT p90 | TTFT min–max | Full reply median | Errors |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        if r["n"]:
            row = (
                f"| `{r['model']}` | {r['n']} | {r['ttft_median_ms']} ms | {r['ttft_p90_ms']} ms "
                f"| {r['ttft_min_ms']}–{r['ttft_max_ms']} ms | {r['total_median_ms']} ms "
                f"| {len(r['errors'])} |"
            )
        else:
            row = f"| `{r['model']}` | 0 | — | — | — | — | {len(r['errors'])} |"
        lines.append(row)
    return "\n".join(lines)


async def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--models", nargs="+", default=DEFAULT_MODELS, help="LiveKit Inference model ids"
    )
    parser.add_argument(
        "--rounds", type=int, default=3, help="repetitions of the prompt set per model"
    )
    parser.add_argument("--temperature", type=float, default=0.3)
    parser.add_argument(
        "--out", type=Path, default=Path("reports"), help="directory for the report files"
    )
    args = parser.parse_args()

    load_dotenv(".env.local")

    print(
        f"Measuring {len(args.models)} models x {len(PROMPTS)} prompts x {args.rounds} rounds ...\n"
    )
    results = []
    for model_id in args.models:
        print(f"  {model_id} ...", end=" ", flush=True)
        r = await measure_model(model_id, args.rounds, args.temperature)
        print(f"median TTFT {r['ttft_median_ms']} ms" if r["n"] else f"FAILED ({r['errors'][:1]})")
        results.append(r)

    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    args.out.mkdir(parents=True, exist_ok=True)
    table = render_table(results)
    header = (
        f"# LLM latency through LiveKit Inference — {stamp} UTC\n\n"
        f"{len(PROMPTS)} short conversational prompts x {args.rounds} rounds per model, "
        f"temperature {args.temperature}, measured from this machine. "
        "TTFT = time to first content token; the number a caller feels.\n\n"
    )
    (args.out / f"llm-latency-{stamp}.md").write_text(header + table + "\n", encoding="utf-8")
    (args.out / f"llm-latency-{stamp}.json").write_text(
        json.dumps(results, indent=2), encoding="utf-8"
    )
    print("\n" + table)
    print(f"\nSaved to {args.out / f'llm-latency-{stamp}.md'}")
    for r in results:
        for err in r["errors"][:3]:
            print(f"  [{r['model']}] {err}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
