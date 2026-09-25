/**
 * The explainer, as a model: three actors built from lines and points, money moving
 * between them, and one wall. Pure state and geometry, no DOM (lib/holo/draw.ts renders).
 *
 *   Company (shipper) ──$3,300──▶ Alex (broker) ──$2,700──▶ Trucker (carrier)
 *                                   └── keeps the gap; a limit it can never cross
 *
 * Six chapters, driven by scroll. Each chapter sets targets (who is visible, which money
 * flows, where the camera looks, what the split is) and everything eases toward them, so
 * scrolling back and forth never cuts. The pointer tilts the camera and hovers actors.
 */

export type P3 = readonly [number, number, number];
export type Seg = readonly [P3, P3];
export type ActorId = "shipper" | "broker" | "carrier";

export const SELL = 3300;
export const LIMIT = 2950;
export const PAY = 2700;

// ---- geometry ----------------------------------------------------------------------

function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Seg[] {
  const c: P3[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y1, z0],
    [x0, y1, z0],
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const e = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  return e.map(([a, b]) => [c[a], c[b]] as const);
}

/** Rectangle in the plane z = const. */
function rectXY(x0: number, y0: number, x1: number, y1: number, z: number): Seg[] {
  return [
    [[x0, y0, z], [x1, y0, z]],
    [[x1, y0, z], [x1, y1, z]],
    [[x1, y1, z], [x0, y1, z]],
    [[x0, y1, z], [x0, y0, z]],
  ];
}

/** A 2D profile in (x, y) extruded between z0 and z1. */
function prism(profile: [number, number][], z0: number, z1: number): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < profile.length; i++) {
    const [ax, ay] = profile[i];
    const [bx, by] = profile[(i + 1) % profile.length];
    out.push([[ax, ay, z0], [bx, by, z0]], [[ax, ay, z1], [bx, by, z1]], [[ax, ay, z0], [ax, ay, z1]]);
  }
  return out;
}

function translate(segs: Seg[], dx: number, dy: number, dz: number): Seg[] {
  return segs.map(([a, b]) => [
    [a[0] + dx, a[1] + dy, a[2] + dz],
    [b[0] + dx, b[1] + dy, b[2] + dz],
  ]);
}

/** The shipper: a hall with a sawtooth roof, a chimney, a door and two windows. */
function factory(): Seg[] {
  const W = 1.1;
  const D = 0.7;
  const segs: Seg[] = [...box(-W, 0, -D, W, 1.0, D)];
  const tooth = (2 * W) / 3;
  for (let i = 0; i < 3; i++) {
    const x0 = -W + i * tooth;
    const x1 = x0 + tooth;
    for (const z of [-D, D]) {
      segs.push([[x0, 1.0, z], [x0, 1.38, z]], [[x0, 1.38, z], [x1, 1.0, z]]);
    }
    segs.push([[x0, 1.38, -D], [x0, 1.38, D]]);
  }
  segs.push(...box(0.55, 1.0, -0.45, 0.8, 2.0, -0.2));
  segs.push(...rectXY(-0.25, 0, 0.25, 0.56, D));
  segs.push(...rectXY(-0.85, 0.62, -0.5, 0.84, D), ...rectXY(0.5, 0.62, 0.85, 0.84, D));
  return segs;
}

/** The carrier: trailer, cab (slanted windshield), a side window. Wheels are separate. */
function truck(): Seg[] {
  const segs: Seg[] = [...box(-1.6, 0.32, -0.45, 0.6, 1.25, 0.45)];
  segs.push(
    ...prism(
      [
        [0.7, 0.32],
        [1.55, 0.32],
        [1.55, 0.82],
        [1.3, 1.18],
        [0.7, 1.18],
      ],
      -0.42,
      0.42,
    ),
  );
  segs.push(...rectXY(0.9, 0.82, 1.24, 1.08, 0.42), ...rectXY(0.9, 0.82, 1.24, 1.08, -0.42));
  // Trailer ribs, so it reads as a box van from any angle.
  for (const x of [-1.05, -0.5, 0.05]) segs.push([[x, 0.32, 0.45], [x, 1.25, 0.45]]);
  return segs;
}

export type Wheel = { x: number; y: number; z: number; r: number };
const WHEEL_X = [-1.35, -0.98, 0.95, 1.35];
function wheels(): Wheel[] {
  return WHEEL_X.flatMap((x) => [0.47, -0.47].map((z) => ({ x, y: 0.17, z, r: 0.17 })));
}

function sphere(n: number, r: number): P3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts: P3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    pts.push([Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r]);
  }
  return pts;
}

/** Deterministic shuffle, so the "materialize" order is the same every visit. */
function shuffled(n: number, seed: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- the world -----------------------------------------------------------------------

export const POS: Record<ActorId, P3> = {
  shipper: [-4.3, 0, -0.3],
  broker: [0, 0, -0.5],
  carrier: [4.0, 0, 0.25],
};

export const SPHERE_Y = 1.45;
export const SPHERE_R = 0.72;
export const WALL_X = 1.95;

export const WORLD = {
  shipper: translate(factory(), ...POS.shipper),
  carrier: translate(truck(), ...POS.carrier),
  wheels: wheels().map((w) => ({ ...w, x: w.x + POS.carrier[0], z: w.z + POS.carrier[2] })),
  sphere: sphere(240, SPHERE_R).map(([x, y, z]) => [x + POS.broker[0], y + SPHERE_Y, z + POS.broker[2]] as P3),
};

/** Where each actor's label and hit area sit, in world space. */
export const ANCHOR: Record<ActorId, P3> = {
  shipper: [POS.shipper[0], 2.15, POS.shipper[2]],
  broker: [POS.broker[0], SPHERE_Y + SPHERE_R + 0.45, POS.broker[2]],
  carrier: [POS.carrier[0], 1.55, POS.carrier[2]],
};

/** Money paths: quadratic Béziers between actors. */
export const PATHS = {
  sb: [
    [POS.shipper[0] + 0.6, 1.9, POS.shipper[2]],
    [-2.2, 3.2, -0.4],
    [POS.broker[0] - SPHERE_R - 0.1, SPHERE_Y, POS.broker[2]],
  ] as [P3, P3, P3],
  bc: [
    [POS.broker[0] + SPHERE_R + 0.1, SPHERE_Y, POS.broker[2]],
    [2.1, 3.0, -0.15],
    [POS.carrier[0] - 0.9, 1.5, POS.carrier[2]],
  ] as [P3, P3, P3],
};

export function bezier([a, c, b]: [P3, P3, P3], t: number): P3 {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
  ];
}

// ---- chapters ----------------------------------------------------------------------

type Target = {
  /** Materialized (1) or dissolved (0): shipper, broker, carrier. */
  vis: [number, number, number];
  /** How much each actor matters in this chapter; the others fade and lose their label. */
  emph: [number, number, number];
  /** The slice of the world (x from, x to) the camera must fit into the free screen area. */
  frame: [number, number];
  flowSB: number;
  flowBC: number;
  waves: number;
  wall: number;
  gauge: number;
  limit: number;
  freight: number;
  road: number;
  pay: number | "tension" | "push";
  focus: ActorId | null;
  you: boolean;
};

/** Frames: the factory alone, factory + Alex, everyone, Alex + the truck. */
const F_SHIPPER: [number, number] = [-5.95, -2.45];
const F_SELL: [number, number] = [-5.65, 1.95];
const F_ALL: [number, number] = [-5.25, 6.25];
const F_CALL: [number, number] = [-1.1, 6.3];

export const CHAPTERS: Target[] = [
  { vis: [1, 0, 0], emph: [1, 1, 1], frame: F_SHIPPER, flowSB: 0, flowBC: 0, waves: 0, wall: 0, gauge: 0, limit: 0, freight: 0, road: 0, pay: 0, focus: "shipper", you: false },
  { vis: [1, 1, 0], emph: [1, 1, 1], frame: F_SELL, flowSB: 1, flowBC: 0, waves: 0, wall: 0, gauge: 1, limit: 0, freight: 0, road: 0, pay: 0, focus: "broker", you: false },
  { vis: [1, 1, 1], emph: [1, 1, 1], frame: F_ALL, flowSB: 0.35, flowBC: 1, waves: 0, wall: 0, gauge: 1, limit: 0, freight: 1, road: 1, pay: PAY, focus: "carrier", you: false },
  { vis: [1, 1, 1], emph: [0, 1, 1], frame: F_CALL, flowSB: 0.2, flowBC: 0.45, waves: 1, wall: 0, gauge: 1, limit: 0, freight: 1, road: 0.3, pay: "tension", focus: null, you: false },
  { vis: [1, 1, 1], emph: [0, 1, 1], frame: F_CALL, flowSB: 0.15, flowBC: 0.3, waves: 0.55, wall: 1, gauge: 1, limit: 1, freight: 1, road: 0.2, pay: "push", focus: "broker", you: false },
  { vis: [1, 1, 1], emph: [0.55, 1, 1], frame: F_ALL, flowSB: 0.3, flowBC: 0.55, waves: 0, wall: 0.35, gauge: 1, limit: 1, freight: 1, road: 0.5, pay: PAY, focus: "carrier", you: true },
];

const frameCenter = (f: [number, number]) => (f[0] + f[1]) / 2;
const frameSpan = (f: [number, number]) => f[1] - f[0];

type Actor = { reveal: number; order: number[] };
type Ask = { x: number; y: number; z: number; vx: number; life: number; bounced: boolean };
type Spark = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number };
type Ping = { actor: ActorId; age: number };

export const ACTOR_INDEX: Record<ActorId, number> = { shipper: 0, broker: 1, carrier: 2 };

const ease = (v: number, target: number, dt: number, k: number) => v + (target - v) * (1 - Math.exp(-dt * k));

export class HoloScene {
  clock = 0;
  chapter = 0;
  /** Pointer over the canvas, -1..1 on each axis; null when away. */
  pointer: { x: number; y: number } | null = null;
  hovered: ActorId | null = null;

  /** Screen pixels on the left covered by the chapter card; the camera frames the rest. */
  insetLeft = 0;

  camX = frameCenter(CHAPTERS[0].frame);
  /** World units the camera fits across the free area (the chapter's frame, eased). */
  span = frameSpan(CHAPTERS[0].frame);
  yaw = -0.36;
  pitch = 0.33;
  emph: [number, number, number] = [1, 1, 1];

  actors: Record<ActorId, Actor> = {
    shipper: { reveal: 0, order: shuffled(WORLD.shipper.length, 7) },
    broker: { reveal: 0, order: shuffled(WORLD.sphere.length, 11) },
    carrier: { reveal: 0, order: shuffled(WORLD.carrier.length, 13) },
  };

  flowSB = 0;
  flowBC = 0;
  waves = 0;
  wall = 0;
  wallFlash = 0;
  gauge = 0;
  limit = 0;
  freight = 0;
  road = 0;
  roadOffset = 0;
  wheelAngle = 0;
  pay = 0;
  push = 0;
  youPulse = 0;

  particlesSB: number[] = [];
  particlesBC: number[] = [];
  asks: Ask[] = [];
  sparks: Spark[] = [];
  pings: Ping[] = [];
  private spawnSB = 0;
  private spawnBC = 0;
  private spawnAsk = 0;
  private wasOver = false;

  /** Screen positions of the actors after the last draw, for hover and click. */
  anchors: Partial<Record<ActorId, { x: number; y: number; r: number }>> = {};

  setChapter(n: number): void {
    this.chapter = Math.max(0, Math.min(CHAPTERS.length - 1, n));
  }

  setInset(px: number): void {
    this.insetLeft = Math.max(0, px);
  }

  ping(actor: ActorId): void {
    this.pings.push({ actor, age: 0 });
  }

  hitTest(x: number, y: number): ActorId | null {
    let best: ActorId | null = null;
    let bestD = Infinity;
    for (const id of Object.keys(this.anchors) as ActorId[]) {
      const a = this.anchors[id]!;
      if (this.actors[id].reveal < 0.5 || this.emph[ACTOR_INDEX[id]] < 0.5) continue;
      const d = Math.hypot(x - a.x, y - a.y);
      if (d < a.r && d < bestD) {
        best = id;
        bestD = d;
      }
    }
    return best;
  }

  step(dt: number): void {
    this.clock += dt;
    const T = CHAPTERS[this.chapter];

    // Camera: the chapter's framing plus the pointer's tilt.
    this.camX = ease(this.camX, frameCenter(T.frame), dt, 2.2);
    this.span = ease(this.span, frameSpan(T.frame), dt, 2.2);
    this.emph = this.emph.map((v, i) => ease(v, T.emph[i], dt, 2.6)) as [number, number, number];
    const px = this.pointer?.x ?? 0;
    const py = this.pointer?.y ?? 0;
    this.yaw = ease(this.yaw, -0.36 + px * 0.28, dt, 3);
    this.pitch = ease(this.pitch, 0.33 + py * 0.08, dt, 3);

    // Actors materialize and dissolve.
    (["shipper", "broker", "carrier"] as ActorId[]).forEach((id, i) => {
      const a = this.actors[id];
      const target = T.vis[i];
      const speed = target > a.reveal ? 1.1 : 2.4;
      a.reveal = Math.max(0, Math.min(1, a.reveal + Math.sign(target - a.reveal) * dt * speed));
      if (Math.abs(target - a.reveal) < dt * speed) a.reveal = target;
    });

    this.flowSB = ease(this.flowSB, T.flowSB, dt, 3);
    this.flowBC = ease(this.flowBC, T.flowBC, dt, 3);
    this.waves = ease(this.waves, T.waves, dt, 3);
    this.wall = ease(this.wall, T.wall, dt, 3);
    this.gauge = ease(this.gauge, T.gauge, dt, 3);
    this.limit = ease(this.limit, T.limit, dt, 3);
    this.freight = ease(this.freight, T.freight, dt, 1.6);
    this.road = ease(this.road, T.road, dt, 2);
    this.youPulse = ease(this.youPulse, T.you ? 1 : 0, dt, 3);
    this.wallFlash = Math.max(0, this.wallFlash - dt * 1.8);

    // The split of the $3,300.
    let payTarget: number;
    if (T.pay === "tension") {
      payTarget = PAY + 380 * (0.5 + 0.5 * Math.sin(this.clock * 1.25));
    } else if (T.pay === "push") {
      this.push = 2820 + 600 * (0.5 + 0.5 * Math.sin(this.clock * 1.05));
      payTarget = Math.min(this.push, LIMIT);
      const over = this.push > LIMIT;
      if (over && !this.wasOver) this.wallFlash = 1;
      this.wasOver = over;
    } else {
      payTarget = T.pay;
      this.push = payTarget;
      this.wasOver = false;
    }
    this.pay = ease(this.pay, payTarget, dt, T.pay === "push" ? 9 : 3);

    // Road and wheels: the truck drives in place.
    this.roadOffset = (this.roadOffset + dt * this.road * 1.6) % 0.7;
    this.wheelAngle += dt * this.road * 9;

    // Money particles along the paths.
    this.spawnSB += dt * this.flowSB * 5;
    while (this.spawnSB >= 1) {
      this.particlesSB.push(0);
      this.spawnSB -= 1;
    }
    this.spawnBC += dt * this.flowBC * 5;
    while (this.spawnBC >= 1) {
      this.particlesBC.push(0);
      this.spawnBC -= 1;
    }
    this.particlesSB = this.particlesSB.map((t) => t + dt / 1.6).filter((t) => t < 1);
    this.particlesBC = this.particlesBC.map((t) => t + dt / 1.6).filter((t) => t < 1);

    // The asks that hit the wall (chapter 5) and bounce back to the truck.
    if (this.wall > 0.5) {
      this.spawnAsk += dt;
      if (this.spawnAsk > 0.9) {
        this.spawnAsk = 0;
        this.asks.push({ x: POS.carrier[0] - 1.0, y: 1.2 + Math.random() * 0.6, z: 0.1, vx: -2.6, life: 2.4, bounced: false });
      }
    }
    for (const a of this.asks) {
      a.x += a.vx * dt;
      a.life -= dt;
      if (!a.bounced && a.x <= WALL_X) {
        a.bounced = true;
        a.vx = 1.9;
        this.wallFlash = Math.max(this.wallFlash, 0.8);
        for (let i = 0; i < 5; i++) {
          this.sparks.push({
            x: WALL_X,
            y: a.y,
            z: a.z,
            vx: 0.5 + Math.random() * 0.8,
            vy: (Math.random() - 0.5) * 1.6,
            vz: (Math.random() - 0.5) * 1.2,
            life: 0.5,
          });
        }
      }
    }
    this.asks = this.asks.filter((a) => a.life > 0 && a.x < POS.carrier[0] - 0.6);
    for (const s of this.sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);

    for (const p of this.pings) p.age += dt;
    this.pings = this.pings.filter((p) => p.age < 1);
  }

  /** Jump to the chapter's final state: used for prefers-reduced-motion. */
  settle(): void {
    const T = CHAPTERS[this.chapter];
    this.camX = frameCenter(T.frame);
    this.span = frameSpan(T.frame);
    this.emph = [...T.emph];
    this.yaw = -0.36;
    this.pitch = 0.33;
    (["shipper", "broker", "carrier"] as ActorId[]).forEach((id, i) => {
      this.actors[id].reveal = T.vis[i];
    });
    this.flowSB = 0;
    this.flowBC = 0;
    this.waves = 0;
    this.wall = T.wall;
    this.gauge = T.gauge;
    this.limit = T.limit;
    this.freight = T.freight;
    this.road = 0;
    this.youPulse = T.you ? 1 : 0;
    this.pay = T.pay === "tension" ? PAY + 250 : T.pay === "push" ? LIMIT : T.pay;
    this.push = this.pay;
    this.particlesSB = [];
    this.particlesBC = [];
    this.asks = [];
    this.sparks = [];
    this.pings = [];
  }
}
