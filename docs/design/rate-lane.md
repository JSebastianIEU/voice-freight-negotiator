# The Rate Lane — visual grammar

The web client has one picture, and everything on screen is a detail of it.

## The metaphor

A freight negotiation is two parties pushing a number along a line. So the screen is
**a lane**: a horizontal number line drawn like a highway seen from above. Dollars run
left to right. The agent's voice travels along the lane from the left; the carrier's
voice comes from the right. Every price the LLM wants to say **drops onto the lane at
the x of its amount**.

The min and max of the load are **never drawn**. When the guardian rejects a price, the
marker hits an invisible wall at its own x, the wall flashes for a moment, and the
marker bounces back and falls, dim, below the lane. When the guardian accepts, the
marker locks into the lane and stays. You never see the box; you see things hitting
its walls. That is the whole thesis of the project made visible: the limits are not in
the conversation, they are in the world the conversation happens in.

## Why not orbs, blobs or a chat window

The reference we looked at (thinking-orbs) does one thing well: a single monochrome
vocabulary that tells you what the agent is doing, cheap to render, honest about state.
We keep the discipline and change the vocabulary. A chat window tells you what was said;
a lane tells you what was *tried*. The transcript still exists, as a log strip under the
lane, because the article needs quotes, but it is not the hero.

## States

| State | Lane | Waves | Center line |
|---|---|---|---|
| idle (no call) | still, axis visible | none | still, dim |
| initializing / connecting | still | none | slow pulse |
| listening | still | carrier wave, right → left | still |
| thinking | still | none | dashes drift, opacity breathes |
| speaking | still | agent wave, left → right | dashes drift faster |
| price proposed | marker drops, hollow, hangs on the lane | — | — |
| price rejected | wall flash at x, marker bounces toward center, falls dim | — | — |
| price accepted | marker fills, locks with a small bounce | — | — |
| failed / disconnected | axis fades to 40 % | none | still |

Every state is driven by real data: `useVoiceAssistant().state`, the agent's audio track
level, the local microphone level and the guardian data channel. Nothing is faked on a
real call. `?demo=1` runs a scripted negotiation for previews and screenshots.

## Palette

Monochrome ink on near-black, plus **one** accent for money.

| Token | Value | Use |
|---|---|---|
| bg | `#0a0a0a` | page |
| ink | `#ededed` | lane edges, axis labels, agent wave |
| ink-dim | ink at 35 % | dashes, carrier wave, fallen markers |
| accent | `#f5b301` (amber) | price markers, wall flash |

Accepted = accent, filled. Rejected = accent hollow while falling, then ink-dim. There is no
green and no red: the outcome is told by physics and fill, not by traffic-light colours.

## Type

Geist Sans for prose, Geist Mono for every number (axis, markers, latency). Numbers are the
subject of this product; they get the monospace.

## Motion rules

- Plain canvas 2D. No WebGL, no filters, no shadows. Same pixels on every device.
- One `requestAnimationFrame` loop, paused when the tab is hidden.
- Gravity and bounce are simple integrator math (see `web/lib/lane/model.ts`), tuned so a
  drop takes ~600 ms and a rejection reads in under a second.
- `prefers-reduced-motion`: a single static frame, markers placed, no waves.
- Nothing moves unless something happened. An idle lane is a still lane.

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ VOICE FREIGHT NEGOTIATOR              [state] [latency]  │  header, one line
│                                                          │
│ ─────────────── the lane (hero, full width) ──────────── │  canvas
│   $1k      $2k      $3k      $4k      $5k                │
│                                                          │
│ ● Start call / ● Hang up   mic                           │  controls
│                                                          │
│ log ──────────────────────────────────────────────────── │  transcript + verdicts,
│ carrier  I can do thirty-two fifty                       │  one stream, mono
│ guardian $3,250 blocked · too high                       │
│ agent    I can't do 3250. I can go to 2900.              │
└──────────────────────────────────────────────────────────┘
```

On phones the lane keeps full width and the log scrolls under it.
