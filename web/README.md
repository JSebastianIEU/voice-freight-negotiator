# Web client

The page at [talk-to-alex.web.app](https://talk-to-alex.web.app): a short explainer of how
freight brokers make money, a two-step setup (a trucking company and a load), the live call
with Alex and the reveal of Alex's limits at the end. English and Spanish.

Next.js (App Router) and TypeScript. The browser never sees the LiveKit API secret: it asks
`/api/token` for a token the server signs, for one fresh room, valid for 15 minutes, carrying
the chosen load and the page's language to the agent.

```bash
npm install
cp .env.example .env.local   # LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
npm run dev                  # http://localhost:3000, with the agent running: cd ../agent && make dev
npm run lint && npm test     # eslint, and the token endpoint tests (vitest)
```

`/demo` plays a scripted negotiation without a call. The reasoning behind the client:
[ADR-005](../docs/decisions/ADR-005-web-client.md); the design: [showcase.md](../docs/design/showcase.md).
