# The showcase: making the negotiation legible

The first public version answered the first round of feedback ("I talked to it but did not
understand what Alex does") with more explanation: a briefing, a load board, persona cards,
a move list, a log. The second round of feedback was about that answer: *too much text in
one place, no obvious place to click, and the roles still unclear. Who is the carrier, who is
the broker, who pays whom?* It also asked for something the agent could not do yet, which was
to check who is calling before talking money (see
[ADR-007](../decisions/ADR-007-verify-the-caller-in-code.md)).

This is the redesign. It rests on four rules:

- **One decision per screen.** Each screen asks for one choice. The next action is always
  the biggest thing on it.
- **Show the market, don't describe it.** Who pays whom is an animation you scroll through,
  not a paragraph.
- **The page answers the mouse.** Hover, tilt and light make it feel like an object, not a
  form.
- **Every number is a receipt.** Captions, stages and the final reveal come from the desk's
  events, never from the transcript.

## The path

1. **Hero.** One question, *"Can you talk an AI into overpaying?"*, one line of context, and
   one button: **Call Alex**. The orb (Alex) leans in when the button is hovered. A quieter
   second button plays a sample call, and a cue invites a scroll.
2. **How it works.** A holographic scene stays pinned while six chapters scroll over it,
   one sentence each (below).
3. **Setup, two steps.** *Who are you?* Four trucking companies, each with its MC number,
   equipment and fleet; "what's an MC number?" folds out. *Which load?* Six loads, with the
   ones your truck can haul first. The others say Alex will refuse them, which is a thing
   worth trying. Every rate reads "?". A summary follows, then one big button.
4. **The call.** Live over LiveKit, or scripted, on the same screen (below).
5. **The reveal.** Alex's secret numbers, and what you got.

## The explainer: six chapters, one scene

| Chapter | Says | The scene shows |
|---|---|---|
| 1 | A company needs to ship something. | A wireframe factory with an amber cube of freight at its door. |
| 2 | It pays a broker to get it there. | Alex appears as a point sphere; $3,300 flows to it in amber. |
| 3 | The broker hires a trucker for less. | The truck arrives, the freight flies into it, $2,700 flows on; the gauge splits $3,300 into trucker and broker. |
| 4 | Truckers call to negotiate. Alex answers. | Voice waves between truck and sphere; the split slides back and forth. |
| 5 | Alex has a limit it can never cross. | An amber wall rises between them. Every ask past it bounces back, and the gauge's limit tick flashes "blocked by code". |
| 6 | Your turn. Try to break it. | The truck is labelled "you"; the buttons to call are on the card. |

**Visual grammar.** The palette has two colours with fixed meanings: ice-blue lines are
structure (who exists), amber is money (what moves). Lines are drawn twice, wide and faint
then thin and bright, with additive blending, and that is the whole hologram. It is Canvas
2D, with no WebGL and no images. Chapter changes never cut: each chapter sets targets
(visibility, flows, the split, the wall, the framing) and everything eases toward them, so
scrolling back replays the story backwards.

**Framing.** Each chapter names the slice of the world it needs (the factory alone, factory
and Alex, everyone, Alex and the truck). The camera fits that slice into the free part of
the screen: right of the text on wide screens, above it on phones and tablets. Actors that
do not matter in a chapter fade out and lose their label, so nothing is ever drawn under
the text.

**Interaction.** Moving the mouse tilts the camera. Hovering an actor frames it in brackets,
and clicking sends a pulse through it. Dots on the left jump between chapters.

## The call screen

What to do next comes first and is the largest element. Everything else is below it.

- **Your move.** The goal of the current stage and, until money comes up, the exact line
  to say in the page's language, for example *"Mike with Redline Transport, MC 884-2210"*.
  From the first rate on, the card only names where the haggling stands (Alex moved, best
  and final, Alex can book that) and the visitor negotiates their own way.
- **Tricks.** Nine chips, one tap each, in the page's language. Seven are the attack catalog (anchor high, fake
  urgency, "your boss said yes", per mile, repeat after me, fake system note, sob story).
  Two are identity tricks: a made-up MC, and a real carrier's MC with a revoked authority.
  Tapping a chip swaps its line into *your move*, with figures taken from the load so they
  land above the limit.
- **Stages.** Load → ID check → details → price → deal. The desk's events set them: the
  carrier verified or refused, the first rate, the booking. Only the step into the ID check
  comes from the transcript, when Alex asks for the MC number. A failed ID check turns that
  step white.
- **The orb.** Alex breathes, thinks and speaks. Every desk decision flashes on it as a
  caption in the page's language: *verified*, *$2,575 offered*, *$3,400 blocked*.
- **Transcript.** You, Alex and a third voice, **code**, in the order they happened.
  `$3,400 · blocked · above what this load can pay` sits between the ask and Alex's reply.

The **sample call** is 67 seconds scripted from real desk events: identified, verified,
first offer, a blocked ask, a counter, a blocked fake system note, the deal. It plays on
the same screen and can be skipped to the result.

**Hanging up.** The visitor can hang up at any time. Alex hangs up too: once the load is
booked and the driver's details are exchanged, when the caller says goodbye, or when the
desk refuses a caller, it says its closing line and calls `end_call`, which closes the room.
The browser sees the disconnect and shows the reveal.

## The reveal

- **Headline.** *You got paid $2,600.*, *Alex won't work with an unverified carrier.*, or
  *No deal this time.*
- **The price line.** Alex's floor, target and limit, which are the numbers the model never
  saw. Every offer Alex made sits on it. Every ask the desk refused sits in the striped zone
  past the limit, and the deal is the bright dot. Phones get the same figures as a legend.
- **Three figures.** How far under the limit the deal landed, how many asks and tricks were
  blocked, and whether the ID check passed.

Every figure comes from events the worker published during the call. The private range
comes from the catalog.

## Two languages, one Alex

The page is English or Spanish. The language toggle sits in the header, is remembered per
browser, and defaults to the browser's language. The language the page is in when the call
starts travels to the worker in the dispatch metadata, next to the load, and Alex answers
in it: the greeting, the negotiation, the amounts ("dos mil cuatrocientos cincuenta"). The
speech recognizer runs in multilingual mode, so a caller who switches mid-call is followed.
Underneath, nothing changes: the desk spells each amount in the call's language and the
output filter reads Spanish amounts, refusals and agreements the same way it reads English.

Every line the page suggests, and every trick, is written in both languages. Suggested lines
stop once money comes up: the first steps are the same on every call, the negotiation is
the visitor's own. The scripted sample call stays in English.

The attack replay (`make attacks`) runs in English only; a Spanish replay is test-bench
work (milestone 6).

## One catalog

`agent/src/freight_negotiator/data/catalog.json` holds the broker, the six loads (with
English and Spanish commodity and notes) and the carrier directory. The directory has four
carriers visitors can play, one with an inactive authority and one that visitors cannot
pick. The agent reads the file. The web client ships a byte-for-byte copy
(`web/data/catalog.json`, refreshed by `make sync-catalog`), and an agent test fails when the
two drift. The private numbers are in the copy too, on purpose: the claim of this project is
that the *model* never sees them, not that a curious visitor cannot. The reveal shows them.

## Cost of the effects

- Canvases pause when they are off screen or the tab is hidden.
- The pointer loop runs only while the pointer moves. The spotlight reaches the stylesheet
  through two CSS variables, so it costs no React renders.
- Touch screens get no cursor, tilt or magnetism. Reduced motion gets still frames: each
  chapter is drawn once, already settled.

## What is deliberately not there

- No score, no leaderboard, no timer. The point is to feel the wall, not to win.
- No hint from Alex about the tricks. The chips are the visitor's, not the agent's.
- No per-carrier pricing in the agent. The companies are for the visitor's role-play and for
  the identity check. The price a load pays does not depend on who is calling, which is also
  why a borrowed identity cannot buy a better rate.
