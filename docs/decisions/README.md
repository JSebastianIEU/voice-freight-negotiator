# Architecture Decision Records

Short records of the decisions that shape this project, in the order they were taken. Each one
states the context, the decision, the alternatives considered and the consequences we accept.
They are written so the choice can be defended in an interview, not only executed.

| ADR | Decision |
|---|---|
| [001](ADR-001-livekit-agents.md) | LiveKit Agents (Python) on LiveKit Cloud |
| [002](ADR-002-livekit-inference.md) | STT / LLM / TTS through LiveKit Inference |
| [003](ADR-003-llm-choice.md) | DeepSeek chat as the main LLM |
| [004](ADR-004-price-guardian-in-code.md) | Price limits enforced in code, in two layers |
| [005](ADR-005-web-client.md) | Next.js + TypeScript client with a server-side token endpoint |
| [006](ADR-006-gcp-cloud-run.md) | GCP Cloud Run for the agent worker and the web client |
| [007](ADR-007-verify-the-caller-in-code.md) | Verify the caller in code before any rate |
