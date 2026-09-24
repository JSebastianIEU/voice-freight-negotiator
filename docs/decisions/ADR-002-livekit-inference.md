# ADR-002: STT / LLM / TTS through LiveKit Inference

**Status:** accepted · **Date:** 2026-09-24

## Context
A voice pipeline needs three model providers (speech-to-text, language model, text-to-speech).
Each one normally means an account, an API key, a billing page and a spending limit. The test
bench (milestone 6) also wants to swap the LLM several times.

## Decision
Call all three through LiveKit Inference, using only the LiveKit Cloud API key. Models are
chosen by string id (`deepgram/nova-3`, `deepseek/...`, `cartesia/sonic`) and can be replaced
with one setting.

## Alternatives considered
- **Direct provider keys via LiveKit plugins** (`livekit-plugins-openai`, `-deepgram`, ...):
  more control (fine-grained parameters, provider-specific features) and a second set of
  integrations to show. Rejected for now: three billing accounts to cap, and no functional
  gain for milestones 1–5. A direct plugin may be added in the bench as a comparison.

## Consequences
- One spend cap in LiveKit Cloud covers every model call. This is set before the first paid
  call and documented in the README.
- Model availability is whatever Inference exposes; exact ids are verified at implementation
  time and recorded in `config.py`.
- Data flows through LiveKit's inference gateway and its partners, not directly to the model
  vendor. Relevant to ADR-003.
