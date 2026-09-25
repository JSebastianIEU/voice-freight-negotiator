/**
 * The Core: a sphere of particles that *is* the agent on screen. Pure model, no DOM.
 *
 * Each particle has a fixed direction on the unit sphere and a radius factor `r`
 * (1 = on the surface). Every phase of the agent sets a different target for `r`,
 * the rotation speed and the amount of shimmer; particles relax toward those
 * targets with a spring, so phase changes read as motion, never as a cut.
 *
 * Voice drives it directly: the carrier's level pushes particles outward (the
 * core absorbs what it hears), the agent's level sends rings out from the
 * surface (it emits). Guardian verdicts are impulses: a rejected price blows
 * the sphere open and it snaps back; an accepted one contracts it to a tight
 * core that settles. The pointer tilts the sphere (parallax) and a click pings it.
 */

import type { GuardianEvent } from "@/lib/guardian";
import type { AgentPhase } from "@/lib/phase";

export type Particle = {
  /** Unit direction on the sphere. */
  bx: number;
  by: number;
  bz: number;
  /** Radius factor and its velocity (spring). */
  r: number;
  vr: number;
  /** Per-particle phase for shimmer, so particles never move in lockstep. */
  seed: number;
  /** Which emission ring this particle belongs to (0..1 along the sphere's "latitude"). */
  band: number;
};

/** The line of text under the core after a guardian event, already localized. */
export type Caption = {
  text: string;
  tone: "ink" | "accent";
  /** Strike the leading figure: it never made it out of the agent's mouth. */
  strike?: string;
  /** Stays until the next caption instead of fading. */
  sticky?: boolean;
};

export type Verdict = Caption & {
  /** Seconds since it arrived. */
  age: number;
};

export type Ring = { r: number; age: number };

const PARTICLES = 900;
const SPRING = 26; // stiffness of r toward its target
const DAMPING = 7.5;
const RING_SECONDS = 0.9;

type PhaseParams = {
  radius: number; // resting r
  spin: number; // rad/s around the vertical axis
  wobble: number; // tilt oscillation amplitude (rad)
  shimmer: number; // per-particle radial noise amplitude
  alpha: number; // overall opacity
};

const PHASES: Record<AgentPhase, PhaseParams> = {
  idle: { radius: 1, spin: 0.12, wobble: 0.04, shimmer: 0.01, alpha: 0.75 },
  connecting: { radius: 1, spin: 0.3, wobble: 0.1, shimmer: 0.03, alpha: 0.85 },
  listening: { radius: 1, spin: 0.25, wobble: 0.06, shimmer: 0.02, alpha: 1 },
  thinking: { radius: 0.9, spin: 1.1, wobble: 0.12, shimmer: 0.06, alpha: 1 },
  speaking: { radius: 1.0, spin: 0.45, wobble: 0.06, shimmer: 0.02, alpha: 1 },
  failed: { radius: 1.25, spin: 0.02, wobble: 0, shimmer: 0, alpha: 0.3 },
};

export class OrbModel {
  particles: Particle[] = [];
  phase: AgentPhase = "idle";
  clock = 0;
  /** Rotation around the vertical (y) axis, driven by spin. */
  rotY = 0;
  /** Tilt driven by wobble and by the pointer. */
  rotX = 0;
  rotZ = 0;
  /** Current smoothed levels 0..1. */
  agentLevel = 0;
  userLevel = 0;
  /** Pointer offset from the center, -1..1 on each axis; null when away. */
  pointer: { x: number; y: number } | null = null;
  /** Expanding rings after a rejection or a click. */
  rings: Ring[] = [];
  /** The verdicts shown under the core, newest last. */
  verdicts: Verdict[] = [];
  /** Global radius envelope (1 = rest), used for bursts and contractions. */
  envelope = 1;
  private envelopeV = 0;
  private envelopeTarget = 1;
  private envelopeHold = 0;

  constructor() {
    // Fibonacci sphere: evenly spread points, no clustering at the poles.
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < PARTICLES; i++) {
      const y = 1 - (i / (PARTICLES - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const startR = 1.5 + Math.random() * 1.2; // begin scattered; "connecting" pulls them in
      this.particles.push({
        bx: Math.cos(theta) * rad,
        by: y,
        bz: Math.sin(theta) * rad,
        r: startR,
        vr: 0,
        seed: Math.random() * Math.PI * 2,
        band: (y + 1) / 2,
      });
    }
  }

  setLevels(agent: number, user: number): void {
    // Fast attack, slow release: speech onsets read immediately, tails fade.
    this.agentLevel = smooth(this.agentLevel, clamp01(agent));
    this.userLevel = smooth(this.userLevel, clamp01(user));
  }

  apply(ev: GuardianEvent, caption?: Caption | null): void {
    if (caption) {
      this.verdicts.push({ ...caption, age: 0 });
      if (this.verdicts.length > 4) this.verdicts.shift();
    }
    switch (ev.type) {
      case "rate.proposed":
        this.ping(0.12);
        break;
      case "rate.rejected":
        // Blow open, snap back. The ring is the wall it hit.
        this.envelopeV = 6.5;
        this.rings.push({ r: 1, age: 0 });
        break;
      case "rate.accepted":
        // Contract to a tight core, hold, then settle.
        this.envelopeTarget = 0.62;
        this.envelopeHold = 0.55;
        break;
      case "carrier.verified":
        // Recognition: a double scan ring and a small breath in.
        this.rings.push({ r: 1, age: 0 }, { r: 1, age: -0.25 });
        this.ping(0.1);
        break;
      case "carrier.rejected":
        this.envelopeV = 4;
        this.rings.push({ r: 1, age: 0 });
        break;
      case "load.focus":
        this.ping(0.08);
        break;
      case "call.ended":
        // The line closes: one last ring, then it settles.
        this.rings.push({ r: 1, age: 0 });
        break;
    }
  }

  /** A small impulse, used for clicks and for proposals. */
  ping(strength = 0.2): void {
    this.envelopeV += strength * 8;
    this.rings.push({ r: 1, age: 0 });
  }

  step(dt: number): void {
    this.clock += dt;
    const p = PHASES[this.phase];

    // Rotation: spin plus wobble, plus the pointer's tilt.
    this.rotY += p.spin * dt;
    const wobble = Math.sin(this.clock * 1.3) * p.wobble;
    const targetX = wobble + (this.pointer ? this.pointer.y * 0.35 : 0);
    const targetZ = (this.pointer ? -this.pointer.x * 0.25 : 0) + Math.sin(this.clock * 0.7) * p.wobble * 0.5;
    this.rotX += (targetX - this.rotX) * Math.min(1, dt * 4);
    this.rotZ += (targetZ - this.rotZ) * Math.min(1, dt * 4);

    // Envelope: a spring toward its target, with an optional hold after accept.
    if (this.envelopeHold > 0) {
      this.envelopeHold -= dt;
      if (this.envelopeHold <= 0) this.envelopeTarget = 1;
    }
    const eAcc = (this.envelopeTarget - this.envelope) * SPRING - this.envelopeV * DAMPING;
    this.envelopeV += eAcc * dt;
    this.envelope += this.envelopeV * dt;

    // Per-particle radius targets.
    const absorb = this.userLevel * 0.45;
    const emit = this.agentLevel;
    // Speaking: the whole sphere pulses with the voice, plus rings running over it.
    const pulse = emit * 0.28;
    // Thinking: a slow breath in and out, instead of nodding.
    const breath = this.phase === "thinking" ? Math.sin(this.clock * 2.4) * 0.05 : 0;
    for (const q of this.particles) {
      const shimmer = Math.sin(this.clock * 2.1 + q.seed) * p.shimmer;
      // Emission rings travel from pole to pole over the bands as the agent speaks.
      const ring = emit > 0.02 ? Math.max(0, Math.sin(this.clock * 7 - q.band * 8)) * emit * 0.35 : 0;
      const noiseAbsorb = absorb * (0.6 + 0.4 * Math.sin(q.seed * 3 + this.clock * 4));
      const target = (p.radius + breath + pulse + shimmer + ring + noiseAbsorb) * this.envelope;
      const acc = (target - q.r) * SPRING - q.vr * DAMPING;
      q.vr += acc * dt;
      q.r += q.vr * dt;
      if (!Number.isFinite(q.r)) {
        // Self-heal instead of staying invisible forever.
        q.r = p.radius;
        q.vr = 0;
      }
    }

    for (const r of this.rings) {
      r.age += dt;
      r.r = 1 + Math.max(0, r.age) * 1.0;
    }
    this.rings = this.rings.filter((r) => r.age < RING_SECONDS);
    for (const v of this.verdicts) v.age += dt;
  }

  /** Jump straight to rest: used for prefers-reduced-motion. */
  settle(): void {
    const p = PHASES[this.phase];
    for (const q of this.particles) {
      q.r = p.radius;
      q.vr = 0;
    }
    this.envelope = 1;
    this.envelopeV = 0;
    this.rings = [];
  }

  get alpha(): number {
    return PHASES[this.phase].alpha;
  }
}

function smooth(current: number, target: number): number {
  const k = target > current ? 0.55 : 0.12;
  return current + (target - current) * k;
}

function clamp01(v: number): number {
  // NaN fails every comparison, so guard it explicitly: one NaN level would
  // spread through the springs and blank the whole sphere.
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
