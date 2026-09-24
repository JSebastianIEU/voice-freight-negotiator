# ADR-001: LiveKit Agents (Python) on LiveKit Cloud

**Status:** accepted · **Date:** 2026-09-24

## Context
We need real-time, two-way voice between a carrier and an AI agent, with interruptions,
sub-second responses and a path to real phone numbers later. Building this from raw WebRTC
would be a project on its own.

## Decision
Use the `livekit-agents` Python framework and host the rooms on LiveKit Cloud (free Build tier).
The agent joins a room as a participant; LiveKit handles media transport, NAT traversal,
codec negotiation and, later, SIP telephony.

## Alternatives considered
- **Pipecat / Vocode:** similar pipeline model. LiveKit chosen for the managed transport, the
  built-in turn-detector model, the test framework (`AgentSession.run`) and Twilio SIP support
  without extra infrastructure.
- **OpenAI Realtime / Gemini Live (speech-to-speech):** lowest latency, but the LLM would hear
  audio directly and we lose the STT → text → tool-call structure the price guardian depends on.
  Also far less control over which model runs where.
- **Self-hosted LiveKit server:** unnecessary at this scale; Cloud's free tier covers the demo
  and the test bench.

## Consequences
- Python for the agent (the framework's primary SDK); TypeScript stays in the web client.
- We depend on LiveKit's SDK release cadence; versions are pinned in `pyproject.toml`.
- The worker is a long-lived process, not an HTTP service — this drives the deployment choice
  (ADR-006).
