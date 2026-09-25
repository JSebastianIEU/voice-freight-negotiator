/**
 * Render a HoloScene on a 2D canvas: project, then draw lines twice (a wide faint pass
 * and a thin bright one) with additive blending, which is what makes plain lines read as
 * light. Ice for structure, amber only for money. No WebGL, no images, no shaders.
 */

import {
  ACTOR_INDEX,
  ANCHOR,
  type ActorId,
  bezier,
  type HoloScene,
  LIMIT,
  type P3,
  PATHS,
  POS,
  SELL,
  type Seg,
  SPHERE_R,
  SPHERE_Y,
  WALL_X,
  WORLD,
} from "@/lib/holo/scene";

export type HoloLabels = {
  shipper: string;
  shipperSub: string;
  broker: string;
  brokerSub: string;
  carrier: string;
  carrierSub: string;
  fromShipper: string;
  toTrucker: string;
  brokerKeeps: string;
  limit: string;
  blocked: string;
  you: string;
};

export type HoloFonts = { sans: string; mono: string };

const ICE = "191, 227, 255";
const INK = "237, 237, 237";
const AMBER = "245, 179, 1";

type Proj = { x: number; y: number; k: number };

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
/** Moving amounts are shown in $10 steps: a counter that ticks, not one that flickers. */
const tens = (n: number) => Math.round(n / 10) * 10;

/**
 * Where the scene goes on screen. Beside a chapter card (wide screens) the free area is
 * what is right of the card; otherwise the whole width, above the card. The chapter's
 * frame (a slice of the world, eased) is fitted into that area.
 */
type View = { ox: number; oy: number; left: number; right: number; scale: number; side: boolean };

function view(s: HoloScene, w: number, h: number): View {
  const side = s.insetLeft > 0;
  const pad = side ? 28 : 14;
  const left = (side ? s.insetLeft : 0) + pad;
  const right = w - pad;
  const rw = Math.max(160, right - left);
  // A frame of `span` world units measures about 0.92 × span on screen at this yaw.
  const scale = Math.min(rw / (s.span * 0.92), h / (side ? 5.6 : 6.2));
  return { ox: (left + right) / 2, oy: side ? h * 0.6 : h * 0.42, left, right, scale, side };
}

function camera(s: HoloScene, v: View) {
  const { ox, oy, scale } = v;
  const cy = Math.cos(s.yaw);
  const sy = Math.sin(s.yaw);
  const cp = Math.cos(s.pitch);
  const sp = Math.sin(s.pitch);
  const D = 16;
  return (p: P3): Proj => {
    const X = p[0] - s.camX;
    const Y = p[1] - 0.9;
    const x1 = X * cy + p[2] * sy;
    const z1 = -X * sy + p[2] * cy;
    const y2 = Y * cp - z1 * sp;
    const z2 = Y * sp + z1 * cp;
    const k = D / Math.max(4, D - z2);
    return { x: ox + x1 * scale * k, y: oy - y2 * scale * k, k };
  };
}

function strokeSegs(
  ctx: CanvasRenderingContext2D,
  proj: (p: P3) => Proj,
  segs: readonly Seg[],
  color: string,
  alpha: number,
  width = 1,
): void {
  if (alpha <= 0.003 || segs.length === 0) return;
  ctx.beginPath();
  for (const [a, b] of segs) {
    const pa = proj(a);
    const pb = proj(b);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  // Glow pass, then the line itself.
  ctx.strokeStyle = `rgba(${color}, ${(alpha * 0.12).toFixed(3)})`;
  ctx.lineWidth = width * 3.6;
  ctx.stroke();
  ctx.strokeStyle = `rgba(${color}, ${(alpha * 0.85).toFixed(3)})`;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** The share of an actor's segments that have materialized, in its shuffled order. */
function revealed(segs: readonly Seg[], order: number[], reveal: number): Seg[] {
  if (reveal >= 1) return segs as Seg[];
  const n = Math.floor(segs.length * reveal);
  return order.slice(0, n).map((i) => segs[i]);
}

export function drawHolo(
  ctx: CanvasRenderingContext2D,
  s: HoloScene,
  w: number,
  h: number,
  L: HoloLabels,
  F: HoloFonts,
): void {
  ctx.clearRect(0, 0, w, h);
  const v = view(s, w, h);
  const proj = camera(s, v);
  const narrow = w < 768;
  const fs = narrow ? 0.85 : 1;
  const emph = (id: ActorId) => s.emph[ACTOR_INDEX[id]];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  drawGround(ctx, proj, s);

  // --- actors ---------------------------------------------------------------------
  const hi = (id: ActorId) => (s.hovered === id ? 1.45 : 1) * emph(id);
  const flicker = (r: number) => (r > 0 && r < 1 ? 0.65 + Math.random() * 0.35 : 1);

  const shipper = s.actors.shipper;
  strokeSegs(ctx, proj, revealed(WORLD.shipper, shipper.order, shipper.reveal), ICE, 0.75 * shipper.reveal * hi("shipper") * flicker(shipper.reveal));

  const carrier = s.actors.carrier;
  strokeSegs(ctx, proj, revealed(WORLD.carrier, carrier.order, carrier.reveal), ICE, 0.75 * carrier.reveal * hi("carrier") * flicker(carrier.reveal));
  drawWheels(ctx, proj, s, carrier.reveal * hi("carrier"));

  // How much bigger than the everyone-in-view framing things are drawn right now.
  const zoom = Math.max(0.7, Math.min(2.2, v.scale / 75));

  drawFreight(ctx, proj, s);
  drawBroker(ctx, proj, s, hi("broker"), zoom);

  // --- money ----------------------------------------------------------------------
  drawFlow(ctx, proj, PATHS.sb, s.particlesSB, s.flowSB, emph("shipper"));
  drawFlow(ctx, proj, PATHS.bc, s.particlesBC, s.flowBC, 1);
  drawWaves(ctx, proj, s);
  drawWall(ctx, proj, s);
  drawAsks(ctx, proj, s);
  drawPings(ctx, proj, s);

  ctx.restore();

  // --- text (normal blending) -----------------------------------------------------
  const anchors: HoloScene["anchors"] = {};
  const labels: [ActorId, string, string][] = [
    ["shipper", L.shipper, L.shipperSub],
    ["broker", L.broker, L.brokerSub],
    ["carrier", L.carrier, L.carrierSub],
  ];
  for (const [id, title, sub] of labels) {
    const a = s.actors[id];
    const p = proj(ANCHOR[id]);
    anchors[id] = { x: p.x, y: p.y + 40 * fs, r: 80 * fs * zoom };
    const e = emph(id);
    if (a.reveal < 0.05 || e < 0.2) continue;
    // Labels sit just above their model; a faded actor's label fades faster than the actor.
    const alpha = Math.min(1, a.reveal) * (s.hovered === id ? 1 : 0.82) * e * e;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${Math.round(15 * fs)}px ${F.sans}`;
    ctx.fillStyle = `rgba(${INK}, ${alpha.toFixed(3)})`;
    ctx.fillText(title, p.x, p.y - 16 * fs);
    ctx.font = `${Math.round(10 * fs)}px ${F.mono}`;
    ctx.fillStyle = `rgba(${ICE}, ${(alpha * 0.75).toFixed(3)})`;
    ctx.fillText(sub.toUpperCase().split("").join(" "), p.x, p.y - 2 * fs);
    if (s.hovered === id) drawBrackets(ctx, p.x, p.y + 42 * fs, 70 * fs * zoom, 58 * fs * zoom);
  }
  s.anchors = anchors;

  if (s.youPulse > 0.02) {
    const p = proj(ANCHOR.carrier);
    const pulse = 0.5 + 0.5 * Math.sin(s.clock * 3);
    const text = L.you.toUpperCase();
    ctx.font = `600 ${Math.round(11 * fs)}px ${F.mono}`;
    const tw = ctx.measureText(text).width + 16;
    const y = p.y - 44 * fs;
    ctx.fillStyle = `rgba(${AMBER}, ${(0.16 * s.youPulse).toFixed(3)})`;
    roundRect(ctx, p.x - tw / 2, y - 12, tw, 20, 10);
    ctx.fill();
    ctx.strokeStyle = `rgba(${AMBER}, ${((0.5 + 0.4 * pulse) * s.youPulse).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = `rgba(${AMBER}, ${s.youPulse.toFixed(3)})`;
    ctx.textAlign = "center";
    ctx.fillText(text, p.x, y + 2);
  }

  drawFlowLabel(ctx, proj, PATHS.sb, money(SELL), s.flowSB * s.actors.broker.reveal * emph("shipper"), F, fs);
  drawFlowLabel(ctx, proj, PATHS.bc, money(tens(s.pay)), Math.min(1, s.flowBC * 1.4) * s.actors.carrier.reveal, F, fs);
  drawGauge(ctx, s, v, h, L, F, fs);
  drawScan(ctx, s, w, h);
}

// ---- pieces --------------------------------------------------------------------------

function drawGround(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene): void {
  const segs: Seg[] = [];
  for (let z = -2.4; z <= 2.41; z += 0.6) segs.push([[-7, 0, z], [7.5, 0, z]]);
  for (let x = -7; x <= 7.51; x += 0.75) segs.push([[x, 0, -2.4], [x, 0, 2.4]]);
  strokeSegs(ctx, proj, segs, ICE, 0.09);
  // The road in front of the actors, with dashes that move when the truck drives.
  const road: Seg[] = [
    [[-7, 0, 1.1], [7.5, 0, 1.1]],
    [[-7, 0, 1.7], [7.5, 0, 1.7]],
  ];
  strokeSegs(ctx, proj, road, ICE, 0.22);
  const dashes: Seg[] = [];
  for (let x = -7 + s.roadOffset; x < 7.5; x += 0.7) dashes.push([[x, 0, 1.4], [x + 0.32, 0, 1.4]]);
  strokeSegs(ctx, proj, dashes, ICE, 0.28);
}

function drawWheels(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene, alpha: number): void {
  if (alpha <= 0.01) return;
  const segs: Seg[] = [];
  for (const wh of WORLD.wheels) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      segs.push([
        [wh.x + Math.cos(a0) * wh.r, wh.y + Math.sin(a0) * wh.r, wh.z],
        [wh.x + Math.cos(a1) * wh.r, wh.y + Math.sin(a1) * wh.r, wh.z],
      ]);
    }
    // Two spokes, so rotation is visible.
    for (const off of [0, Math.PI / 2]) {
      const a = -s.wheelAngle + off;
      segs.push([
        [wh.x - Math.cos(a) * wh.r, wh.y - Math.sin(a) * wh.r, wh.z],
        [wh.x + Math.cos(a) * wh.r, wh.y + Math.sin(a) * wh.r, wh.z],
      ]);
    }
  }
  strokeSegs(ctx, proj, segs, ICE, 0.6 * alpha);
}

function cube(cx: number, cy: number, cz: number, r: number): Seg[] {
  const c: P3[] = [
    [cx - r, cy - r, cz - r],
    [cx + r, cy - r, cz - r],
    [cx + r, cy + r, cz - r],
    [cx - r, cy + r, cz - r],
    [cx - r, cy - r, cz + r],
    [cx + r, cy - r, cz + r],
    [cx + r, cy + r, cz + r],
    [cx - r, cy + r, cz + r],
  ];
  const e = [
    [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return e.map(([a, b]) => [c[a], c[b]] as const);
}

function drawFreight(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene): void {
  const vis = s.actors.shipper.reveal;
  if (vis < 0.2) return;
  // From the factory door to the back of the trailer, over an arc.
  const t = s.freight;
  const from: P3 = [POS.shipper[0], 0.2, POS.shipper[2] + 0.95];
  const to: P3 = [POS.carrier[0] - 1.1, 0.78, POS.carrier[2]];
  const lift = Math.sin(Math.PI * t) * 1.6;
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t + lift;
  const z = from[2] + (to[2] - from[2]) * t;
  const bob = t < 0.02 ? Math.sin(s.clock * 2.2) * 0.04 : 0;
  // Once loaded it rides inside the trailer: dim, it is behind the trailer's lines.
  const alpha = vis * (t > 0.97 ? 0.35 : 0.95);
  strokeSegs(ctx, proj, cube(x, y + 0.18 + bob, z, 0.18), AMBER, alpha, 1.1);
}

function drawBroker(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene, hi: number, zoom: number): void {
  const a = s.actors.broker;
  if (a.reveal <= 0.01) return;
  const n = Math.floor(WORLD.sphere.length * a.reveal);
  const spin = s.clock * 0.35;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const [bx, , bz] = POS.broker;
  for (let i = 0; i < n; i++) {
    const [x, y, z] = WORLD.sphere[a.order[i]];
    const lx = x - bx;
    const lz = z - bz;
    const p = proj([bx + lx * cs - lz * sn, y, bz + lx * sn + lz * cs]);
    const depth = Math.min(1, Math.max(0.15, p.k - 0.55));
    ctx.fillStyle = `rgba(${INK}, ${(0.55 * depth * hi).toFixed(3)})`;
    // Points grow a little with the zoom, so a close-up sphere stays a solid shape.
    const d = 1.6 * p.k * Math.sqrt(zoom);
    ctx.fillRect(p.x - d / 2, p.y - d / 2, d, d);
  }
  // The pedestal: a ring on the ground and a faint beam up to the sphere.
  const ring: Seg[] = [];
  const orbit: Seg[] = [];
  const m = 28;
  for (let i = 0; i < m; i++) {
    const a0 = (i / m) * Math.PI * 2;
    const a1 = ((i + 1) / m) * Math.PI * 2;
    ring.push([
      [bx + Math.cos(a0) * 0.62, 0, bz + Math.sin(a0) * 0.62],
      [bx + Math.cos(a1) * 0.62, 0, bz + Math.sin(a1) * 0.62],
    ]);
    const tilt = 0.25;
    const o0 = a0 + s.clock * 0.6;
    const o1 = a1 + s.clock * 0.6;
    orbit.push([
      [bx + Math.cos(o0) * 1.05, SPHERE_Y + Math.sin(o0) * tilt, bz + Math.sin(o0) * 1.05],
      [bx + Math.cos(o1) * 1.05, SPHERE_Y + Math.sin(o1) * tilt, bz + Math.sin(o1) * 1.05],
    ]);
  }
  strokeSegs(ctx, proj, ring, ICE, 0.35 * a.reveal * hi);
  strokeSegs(ctx, proj, orbit, ICE, 0.22 * a.reveal * hi);
  const beam: Seg[] = [0, 1, 2, 3].map((i) => {
    const ang = (i / 4) * Math.PI * 2 + s.clock * 0.2;
    return [
      [bx + Math.cos(ang) * 0.62, 0, bz + Math.sin(ang) * 0.62],
      [bx + Math.cos(ang) * 0.25, SPHERE_Y - SPHERE_R * 0.8, bz + Math.sin(ang) * 0.25],
    ];
  });
  strokeSegs(ctx, proj, beam, ICE, 0.12 * a.reveal);
}

function drawFlow(
  ctx: CanvasRenderingContext2D,
  proj: (p: P3) => Proj,
  path: [P3, P3, P3],
  particles: number[],
  strength: number,
  fade: number,
): void {
  if ((strength < 0.01 && particles.length === 0) || fade < 0.02) return;
  // The path itself, faint.
  const segs: Seg[] = [];
  for (let i = 0; i < 24; i++) segs.push([bezier(path, i / 24), bezier(path, (i + 1) / 24)]);
  strokeSegs(ctx, proj, segs, AMBER, 0.18 * strength * fade);
  for (const t of particles) {
    for (let k = 0; k < 4; k++) {
      const tt = t - k * 0.018;
      if (tt < 0) continue;
      const p = proj(bezier(path, tt));
      const a = (1 - k / 4) * Math.min(1, t * 6, (1 - t) * 6) * fade;
      ctx.fillStyle = `rgba(${AMBER}, ${(0.9 * a).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (k === 0 ? 2.4 : 1.6) * p.k, 0, Math.PI * 2);
      ctx.fill();
      if (k === 0) {
        ctx.fillStyle = `rgba(${AMBER}, ${(0.12 * a).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 * p.k, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWaves(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene): void {
  if (s.waves < 0.02) return;
  const truck = proj([POS.carrier[0] + 0.8, 1.35, POS.carrier[2]]);
  const alex = proj([POS.broker[0], SPHERE_Y, POS.broker[2]]);
  const ang = Math.atan2(alex.y - truck.y, alex.x - truck.x);
  const back = Math.atan2(truck.y - alex.y, truck.x - alex.x);
  const period = 1.6;
  for (let i = 0; i < 3; i++) {
    // The trucker talks, then Alex answers: alternating halves of the period.
    const phase = ((s.clock + i * (period / 3)) % period) / period;
    const r = 14 + phase * 60;
    const a = (1 - phase) * 0.55 * s.waves;
    ctx.strokeStyle = `rgba(${ICE}, ${a.toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(truck.x, truck.y, r * truck.k, ang - 0.5, ang + 0.5);
    ctx.stroke();
    const phase2 = ((s.clock + i * (period / 3) + period / 2) % period) / period;
    const r2 = 14 + phase2 * 50;
    ctx.strokeStyle = `rgba(${INK}, ${((1 - phase2) * 0.4 * s.waves).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(alex.x, alex.y, (SPHERE_R * 60 + r2) * 0.5 * alex.k, back - 0.45, back + 0.45);
    ctx.stroke();
  }
}

function drawWall(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene): void {
  if (s.wall < 0.02) return;
  const z0 = -1.1;
  const z1 = 1.0;
  const top = 2.7 * Math.min(1, s.wall * 1.4);
  const corners = [proj([WALL_X, 0, z0]), proj([WALL_X, 0, z1]), proj([WALL_X, top, z1]), proj([WALL_X, top, z0])];
  const glow = s.wall * (0.05 + 0.12 * s.wallFlash);
  ctx.fillStyle = `rgba(${AMBER}, ${glow.toFixed(3)})`;
  ctx.beginPath();
  corners.forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
  ctx.closePath();
  ctx.fill();
  const segs: Seg[] = [
    [[WALL_X, 0, z0], [WALL_X, 0, z1]],
    [[WALL_X, top, z0], [WALL_X, top, z1]],
    [[WALL_X, 0, z0], [WALL_X, top, z0]],
    [[WALL_X, 0, z1], [WALL_X, top, z1]],
  ];
  // A hex-ish shield pattern: horizontal scan lines on the wall.
  for (let y = 0.3; y < top; y += 0.3) segs.push([[WALL_X, y, z0], [WALL_X, y, z1]]);
  strokeSegs(ctx, proj, segs, AMBER, s.wall * (0.45 + 0.55 * s.wallFlash));
}

function drawAsks(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene): void {
  for (const a of s.asks) {
    const p = proj([a.x, a.y, a.z]);
    const alpha = Math.min(1, a.life) * (a.bounced ? 0.45 : 0.95);
    ctx.fillStyle = `rgba(${AMBER}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.6 * p.k, 0, Math.PI * 2);
    ctx.fill();
    // A short trail behind it.
    const tail = proj([a.x - Math.sign(a.vx) * 0.35, a.y, a.z]);
    ctx.strokeStyle = `rgba(${AMBER}, ${(alpha * 0.35).toFixed(3)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  for (const sp of s.sparks) {
    const p = proj([sp.x, sp.y, sp.z]);
    ctx.fillStyle = `rgba(${AMBER}, ${(sp.life * 1.6).toFixed(3)})`;
    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
  }
}

function drawPings(ctx: CanvasRenderingContext2D, proj: (p: P3) => Proj, s: HoloScene): void {
  for (const ping of s.pings) {
    const base: P3 =
      ping.actor === "broker"
        ? [POS.broker[0], SPHERE_Y, POS.broker[2]]
        : ping.actor === "carrier"
          ? [POS.carrier[0], 0.8, POS.carrier[2]]
          : [POS.shipper[0], 0.8, POS.shipper[2]];
    const p = proj(base);
    const t = ping.age;
    ctx.strokeStyle = `rgba(${ICE}, ${((1 - t) * 0.7).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (30 + t * 90) * p.k, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFlowLabel(
  ctx: CanvasRenderingContext2D,
  proj: (p: P3) => Proj,
  path: [P3, P3, P3],
  text: string,
  alpha: number,
  F: HoloFonts,
  fs: number,
): void {
  if (alpha < 0.05) return;
  const p = proj(bezier(path, 0.5));
  ctx.font = `600 ${Math.round(13 * fs)}px ${F.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = `rgba(${AMBER}, ${Math.min(1, alpha).toFixed(3)})`;
  ctx.fillText(text, p.x, p.y - 10);
}

function drawGauge(
  ctx: CanvasRenderingContext2D,
  s: HoloScene,
  v: View,
  h: number,
  L: HoloLabels,
  F: HoloFonts,
  fs: number,
): void {
  const a = s.gauge * s.actors.broker.reveal;
  if (a < 0.02) return;
  const gw = Math.min(420, (v.right - v.left) * (v.side ? 0.62 : 0.92));
  const gx = v.ox - gw / 2;
  const gy = v.side ? h * 0.16 : h * 0.1;
  const bh = 10;
  const pay = Math.max(0, Math.min(SELL, s.pay));
  const px = gx + gw * (pay / SELL);
  // The split only means something once there is a trucker to pay.
  const split = a * s.actors.carrier.reveal;
  const shown = tens(pay);

  ctx.textBaseline = "alphabetic";
  ctx.font = `${Math.round(11 * fs)}px ${F.mono}`;
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(${ICE}, ${(0.8 * a).toFixed(3)})`;
  ctx.fillText(`${money(SELL)} ${L.fromShipper}`.toUpperCase(), gx + gw / 2, gy - 12);

  ctx.strokeStyle = `rgba(${ICE}, ${(0.35 * a).toFixed(3)})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, bh);
  if (px > gx + 1) {
    ctx.fillStyle = `rgba(${ICE}, ${(0.5 * a).toFixed(3)})`;
    ctx.fillRect(gx + 1, gy + 1, px - gx - 1, bh - 1);
  }
  ctx.fillStyle = `rgba(${AMBER}, ${(0.85 * a).toFixed(3)})`;
  ctx.fillRect(px, gy + 1, gx + gw - px - 1, bh - 1);

  ctx.font = `${Math.round(12 * fs)}px ${F.mono}`;
  if (split > 0.02) {
    ctx.textAlign = "left";
    ctx.fillStyle = `rgba(${ICE}, ${(0.9 * split).toFixed(3)})`;
    ctx.fillText(`${L.toTrucker} ${money(shown)}`, gx, gy + bh + 18 * fs);
    ctx.textAlign = "right";
    ctx.fillStyle = `rgba(${AMBER}, ${split.toFixed(3)})`;
    ctx.fillText(`${L.brokerKeeps} ${money(SELL - shown)}`, gx + gw, gy + bh + 18 * fs);
  }

  if (s.limit > 0.02) {
    const lx = gx + gw * (LIMIT / SELL);
    const la = s.limit * a;
    const flash = s.wallFlash;
    ctx.strokeStyle = `rgba(${AMBER}, ${(la * (0.8 + 0.2 * flash)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, gy - 8);
    ctx.lineTo(lx, gy + bh + 6);
    ctx.stroke();
    ctx.font = `600 ${Math.round(11 * fs)}px ${F.mono}`;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${AMBER}, ${la.toFixed(3)})`;
    const label = flash > 0.15 ? L.blocked : `${L.limit} ${money(LIMIT)}`;
    ctx.fillText(label.toUpperCase(), Math.min(lx, gx + gw - 60), gy + bh + 36 * fs);
  }
}

function drawScan(ctx: CanvasRenderingContext2D, s: HoloScene, w: number, h: number): void {
  // A faint band sweeping down every few seconds, like a projector refreshing.
  const period = 5.5;
  const t = (s.clock % period) / 1.4;
  if (t > 1) return;
  const y = t * h;
  const g = ctx.createLinearGradient(0, y - 40, 0, y + 40);
  g.addColorStop(0, `rgba(${ICE}, 0)`);
  g.addColorStop(0.5, `rgba(${ICE}, 0.035)`);
  g.addColorStop(1, `rgba(${ICE}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 40, w, 80);
}

function drawBrackets(ctx: CanvasRenderingContext2D, cx: number, cy: number, hw: number, hh: number): void {
  const l = 10;
  ctx.strokeStyle = `rgba(${ICE}, 0.7)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = cx + sx * hw;
    const y = cy + sy * hh;
    ctx.moveTo(x, y - sy * l);
    ctx.lineTo(x, y);
    ctx.lineTo(x - sx * l, y);
  }
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
