# ADR-005: Next.js + TypeScript client with a server-side token endpoint

**Status:** accepted · **Date:** 2026-09-24

## Context
The LiveKit Agents Playground is enough to talk to the agent, but the project needs a demo
that shows the guardian working (blocked offers appearing live), a screen to record the demo
video from, and a visible full-stack piece next to the Python worker.

## Decision
A small Next.js (App Router) + TypeScript app in `web/`, using `@livekit/components-react`.
The browser never holds the LiveKit API secret: it calls `/api/token`, a Next.js route handler
that signs a short-lived, single-room JWT with `livekit-server-sdk`.

## Alternatives considered
- **Playground only:** zero code, no guardian panel, nothing to deploy.
- **Vite + React SPA:** would need a separate token server anyway; Next.js gives the route
  handler in the same deployable.

## Consequences
- Two deployables (worker + web), handled in ADR-006.
- Guardian events (`rate.proposed / rejected / accepted`) travel from the worker to the browser
  over LiveKit's data channel, so the panel needs no extra backend.
