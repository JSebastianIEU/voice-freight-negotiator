/**
 * The Rate Lane, as data. No DOM, no canvas: a pure model that a renderer draws.
 *
 * Coordinates: the lane is a horizontal line. `x` is in pixels along it; `y` is in
 * pixels relative to the lane's center line (negative = above). Prices map to x
 * through `scale`. Everything advances with `step(dt)` in seconds.
 */

import type { GuardianEvent } from "@/lib/guardian";

export type LaneState =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "failed";

export type MarkerPhase = "dropping" | "hanging" | "locked" | "bouncing" | "fallen";

export type Marker = {
  amount: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: MarkerPhase;
  /** Seconds since the marker entered its current phase. */
  age: number;
  reason?: string;
  /** Verdict that arrived while the marker was still in the air; applied on landing. */
  pending?: "lock" | "reject";
};

export type WallFlash = { x: number; age: number };

export type LaneWindow = { min: number; max: number };

/** Dollars visible on the axis. Prices outside are clamped to the edge. */
export const DEFAULT_WINDOW: LaneWindow = { min: 1000, max: 5000 };

// Physics constants, in px and seconds. Tuned so a drop reads in ~0.6 s.
const GRAVITY = 1400;
const DROP_HEIGHT = 90;
const LOCK_BOUNCE = -160;
const REJECT_KICK_UP = -420;
const REJECT_KICK_SIDE = 220;
const FALL_LIMIT = 72;
export const WALL_FLASH_SECONDS = 0.7;

/** How many samples of voice level each wave keeps; one per frame at ~60 fps ≈ 2 s. */
export const WAVE_SAMPLES = 120;

export class LaneModel {
  width = 1;
  state: LaneState = "idle";
  markers: Marker[] = [];
  flashes: WallFlash[] = [];
  /** Newest sample last. Values 0..1. */
  agentWave: number[] = new Array<number>(WAVE_SAMPLES).fill(0);
  userWave: number[] = new Array<number>(WAVE_SAMPLES).fill(0);
  /** Drives dash drift; advances only when the agent is thinking or speaking. */
  dashOffset = 0;
  /** Seconds the model has been alive; used for breathing effects. */
  clock = 0;

  constructor(public window: LaneWindow = DEFAULT_WINDOW) {}

  /** Price → x in pixels. Clamped so an absurd amount still lands on the lane. */
  scale(amount: number): number {
    const t = (amount - this.window.min) / (this.window.max - this.window.min);
    return Math.min(1, Math.max(0, t)) * this.width;
  }

  resize(width: number): void {
    // Keep markers at the same price when the canvas changes size.
    const old = this.width;
    this.width = Math.max(1, width);
    if (old > 1) {
      for (const m of this.markers) m.x = (m.x / old) * this.width;
      for (const f of this.flashes) f.x = (f.x / old) * this.width;
    }
  }

  /** Feed one frame of voice levels (0..1). */
  pushLevels(agent: number, user: number): void {
    this.agentWave.push(clamp01(agent));
    this.agentWave.shift();
    this.userWave.push(clamp01(user));
    this.userWave.shift();
  }

  /** React to a guardian verdict. */
  apply(ev: GuardianEvent): void {
    switch (ev.type) {
      case "rate.proposed":
        this.drop(ev.amount, ev.reason);
        return;
      case "rate.accepted": {
        const m = this.unresolved(ev.amount) ?? this.drop(ev.amount, ev.reason);
        m.reason = ev.reason ?? m.reason;
        // Still in the air: let it land first, lock on landing.
        if (m.phase === "hanging") this.lock(m);
        else m.pending = "lock";
        return;
      }
      case "rate.rejected": {
        const m = this.unresolved(ev.amount) ?? this.drop(ev.amount, ev.reason);
        m.reason = ev.reason ?? m.reason;
        if (m.phase === "hanging") this.reject(m);
        else m.pending = "reject";
        return;
      }
    }
  }

  private unresolved(amount: number): Marker | undefined {
    // Latest marker for this amount that has not been resolved yet.
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i];
      if (m.amount === amount && (m.phase === "dropping" || m.phase === "hanging")) return m;
    }
    return undefined;
  }

  private drop(amount: number, reason?: string): Marker {
    const m: Marker = {
      amount,
      x: this.scale(amount),
      y: -DROP_HEIGHT,
      vx: 0,
      vy: 0,
      phase: "dropping",
      age: 0,
      reason,
    };
    this.markers.push(m);
    return m;
  }

  private lock(m: Marker): void {
    m.phase = "locked";
    m.age = 0;
    m.y = 0;
    m.vy = LOCK_BOUNCE;
  }

  private reject(m: Marker): void {
    m.phase = "bouncing";
    m.age = 0;
    m.y = 0;
    m.vy = REJECT_KICK_UP;
    // Kick back toward the middle of the lane: away from the wall it just hit.
    m.vx = m.x > this.width / 2 ? -REJECT_KICK_SIDE : REJECT_KICK_SIDE;
    this.flashes.push({ x: m.x, age: 0 });
  }

  step(dt: number): void {
    this.clock += dt;
    if (this.state === "thinking") this.dashOffset += 40 * dt;
    if (this.state === "speaking") this.dashOffset += 120 * dt;

    for (const m of this.markers) {
      m.age += dt;
      switch (m.phase) {
        case "dropping":
          m.vy += GRAVITY * dt;
          m.y += m.vy * dt;
          if (m.y >= 0) {
            m.y = 0;
            m.vy = 0;
            if (m.pending === "reject") this.reject(m);
            else if (m.pending === "lock") this.lock(m);
            else {
              m.phase = "hanging";
              m.age = 0;
            }
          }
          break;
        case "locked":
          // Small damped bounce, then rest exactly on the line.
          if (m.vy !== 0) {
            m.vy += GRAVITY * dt;
            m.y += m.vy * dt;
            if (m.y >= 0) {
              m.y = 0;
              m.vy = 0;
            }
          }
          break;
        case "bouncing":
          m.vy += GRAVITY * dt;
          m.y += m.vy * dt;
          m.x += m.vx * dt;
          if (m.y > FALL_LIMIT) {
            m.phase = "fallen";
            m.age = 0;
          }
          break;
        case "hanging":
        case "fallen":
          break;
      }
    }

    for (const f of this.flashes) f.age += dt;
    this.flashes = this.flashes.filter((f) => f.age < WALL_FLASH_SECONDS);
    // Fallen markers linger dim for a while, then leave.
    this.markers = this.markers.filter((m) => !(m.phase === "fallen" && m.age > 6));
  }

  /** Snap everything to its resting place: used for prefers-reduced-motion. */
  settle(): void {
    for (const m of this.markers) {
      m.age = 10;
      m.vx = 0;
      m.vy = 0;
      if (m.phase === "dropping" || m.phase === "hanging") {
        if (m.pending === "reject") {
          m.phase = "fallen";
          m.y = FALL_LIMIT;
        } else {
          m.phase = m.pending === "lock" ? "locked" : "hanging";
          m.y = 0;
        }
      } else if (m.phase === "bouncing") {
        m.phase = "fallen";
        m.y = FALL_LIMIT;
      }
    }
    this.flashes = [];
    this.agentWave.fill(0);
    this.userWave.fill(0);
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
