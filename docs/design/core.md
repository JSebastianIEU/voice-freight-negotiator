# The Core — visual grammar

The web client has one picture: a sphere of particles that *is* the agent. Everything
else on screen is a caption.

## The idea

Nine hundred points on the surface of a sphere, drawn with plain canvas 2D, monochrome
ink on near-black, one amber accent for money. The sphere is never decorated: what it
does is what the pipeline does. It turns slowly when idle, breathes when it listens,
spins and tightens when it thinks, sends rings out from its surface when it speaks.
When the price guardian blocks a number the sphere blows open and snaps back, an amber
ring marking the wall it hit; when it accepts one, the sphere contracts into a tight
core and settles. The pointer tilts it; a click pings it.

No dollars, no axes, no chat bubbles as the hero. The transcript and the verdicts live
in a plain log under it, because the article needs quotes.

## Why this and not the lane

The first attempt drew a number line ("the rate lane"). It was honest but it asked the
viewer to understand a metaphor before enjoying it. A particle sphere is understood in a
second and can carry the same information through motion instead of geometry. Same
discipline as the reference (thinking-orbs: canvas 2D, monochrome, one vocabulary that
tells you what the agent is doing), different object, ours.

## States

| Phase | Rotation | Radius | Shimmer | Meaning |
|---|---|---|---|---|
| idle | 0.12 rad/s | 1.00 | none | nothing is happening |
| connecting | 0.30 | converging from scattered | slight | particles assemble into the sphere |
| listening | 0.25 | 1 + carrier level × 0.45 | slight | it absorbs what it hears |
| thinking | 1.70, tilt wobbles | 0.92 | strong | it is working |
| speaking | 0.50 | 1.04 + rings travelling outward with the agent level | slight | it emits |
| failed | ~0 | 1.25, faded to 30 % | none | it came apart |

Guardian impulses, independent of the phase:

| Event | Motion | Caption |
|---|---|---|
| `rate.proposed` | small ping (ring) | `$3,250  proposed` |
| `rate.rejected` | burst outward, snap back; amber ring expands | `~~$3,250~~  blocked · too high`, fades |
| `rate.accepted` | contract to 62 %, hold 0.55 s, settle | `$2,900  accepted`, stays |

Every state is driven by real data: `useVoiceAssistant().state`, the loudness of the
agent's audio track, the loudness of the local microphone and the guardian data channel.
`/demo` runs a scripted negotiation for previews and screenshots.

## Palette and type

| Token | Value | Use |
|---|---|---|
| bg | `#0a0a0a` | page |
| ink | `#ededed` | particles (alpha by depth), labels |
| accent | `#f5b301` | rings, accepted amounts, the call button |

Geist Sans for prose, Geist Mono for every number and control.

## Motion rules

- Plain canvas 2D, dots and circles only. No WebGL, no filters, no gradients.
- One `requestAnimationFrame` loop; the next frame is scheduled *before* drawing so a
  thrown frame never stops the loop; paused when the tab is hidden.
- Springs, not tweens: every radius relaxes toward its target (stiffness 26, damping
  7.5), so phase changes read as motion, never as a cut.
- Voice levels use fast attack, slow release: onsets show immediately, tails fade.
- `prefers-reduced-motion`: one settled frame, no rings.

## Layout

```
┌────────────────────────────────────────────┐
│ VOICE FREIGHT NEGOTIATOR        demo loop  │
│ ● listening                 room call-…    │
│                                            │
│                 ·  ·  ·  ·                 │
│              ·  the core  ·                │  canvas, 360 px
│                 ·  ·  ·  ·                 │
│               $2,900  accepted             │
│                                            │
│            [ hang up ]   mic               │
│ ────────────────────────────────────────── │
│ agent    Hello! How can I help?            │  log, mono
│ carrier  I can do thirty-two fifty         │
│ guardian $3,250 blocked · too high         │
└────────────────────────────────────────────┘
```

Files: `web/lib/orb/model.ts` (pure model), `web/lib/orb/draw.ts` (renderer),
`web/components/Orb.tsx` (canvas + loop + pointer), `web/components/LiveOrb.tsx` (live
signals), `web/lib/orb/demo.ts` + `/demo` (script).
