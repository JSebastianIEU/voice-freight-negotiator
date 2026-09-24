# Web client

Next.js + TypeScript client for the voice agent: a call button, the agent's state
(listening / thinking / speaking), a live transcript of both sides and a panel that
shows the price guardian's verdicts as they happen.

The browser never sees the LiveKit API secret: it asks `/api/token` for a short-lived,
single-room token that the Next.js server signs.

```bash
npm install
cp .env.example .env.local   # LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
npm run dev                  # http://localhost:3000, with the agent running: cd ../agent && make dev
```

See the repository README and `docs/decisions/ADR-005-web-client.md` for the reasoning.
