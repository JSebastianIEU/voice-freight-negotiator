/**
 * Render an OrbModel with plain canvas 2D: rotate, project, draw dots back to
 * front. No filters, no shadows, no gradients. Monochrome ink plus one amber
 * accent for money.
 */

import type { OrbModel, Particle } from "@/lib/orb/model";

export const THEME = {
  ink: "237, 237, 237",
  accent: "245, 179, 1",
  mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

const FOCAL = 3.2; // perspective strength; larger = flatter

type Projected = { x: number; y: number; z: number; r: number };

export function draw(
  ctx: CanvasRenderingContext2D,
  model: OrbModel,
  size: { width: number; height: number },
): void {
  const { width, height } = size;
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  // Small enough that bursts (up to ~1.6 R) and rings (up to 1.9 R) stay inside the canvas.
  const R = Math.min(width, height) * 0.22;

  const cosY = Math.cos(model.rotY);
  const sinY = Math.sin(model.rotY);
  const cosX = Math.cos(model.rotX);
  const sinX = Math.sin(model.rotX);
  const cosZ = Math.cos(model.rotZ);
  const sinZ = Math.sin(model.rotZ);

  const pts: Projected[] = new Array(model.particles.length);
  for (let i = 0; i < model.particles.length; i++) {
    pts[i] = project(model.particles[i], cosY, sinY, cosX, sinX, cosZ, sinZ);
  }
  // Painter's order: far particles first so near ones sit on top.
  pts.sort((a, b) => a.z - b.z);

  const base = model.alpha;
  for (const p of pts) {
    const depth = Math.min(1, Math.max(0, (p.z + 1) / 2)); // 0 = far, 1 = near
    // Clamp the denominator: a particle flung past the camera must not invert.
    const persp = FOCAL / Math.max(0.6, FOCAL - p.z * 0.9);
    const x = cx + p.x * R * persp;
    const y = cy + p.y * R * persp;
    const dot = Math.max(0.4, (0.9 + depth * 1.5) * persp);
    // Particles far from the surface (bursting or converging) read lighter.
    const off = Math.min(1, Math.abs(p.r - 1) * 0.8);
    const alpha = base * (0.18 + depth * 0.82) * (1 - off * 0.6);
    ctx.fillStyle = `rgba(${THEME.ink}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, dot, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const ring of model.rings) {
    if (ring.age < 0) continue; // scheduled, not started
    const t = 1 - ring.age / 0.9;
    ctx.strokeStyle = `rgba(${THEME.accent}, ${(0.7 * t).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R * ring.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawVerdicts(ctx, model, cx, cy + R + 34);
}

function project(
  q: Particle,
  cosY: number,
  sinY: number,
  cosX: number,
  sinX: number,
  cosZ: number,
  sinZ: number,
): Projected {
  let x = q.bx * q.r;
  let y = q.by * q.r;
  let z = q.bz * q.r;
  // Rotate around Y (spin).
  let tx = x * cosY - z * sinY;
  let tz = x * sinY + z * cosY;
  x = tx;
  z = tz;
  // Rotate around X (tilt).
  const ty = y * cosX - z * sinX;
  tz = y * sinX + z * cosX;
  y = ty;
  z = tz;
  // Rotate around Z (roll).
  tx = x * cosZ - y * sinZ;
  const ty2 = x * sinZ + y * cosZ;
  x = tx;
  y = ty2;
  return { x, y, z, r: q.r };
}

function drawVerdicts(ctx: CanvasRenderingContext2D, model: OrbModel, cx: number, y: number): void {
  const last = model.verdicts[model.verdicts.length - 1];
  if (!last) return;
  // Sticky captions (a booked rate) stay; anything else fades over a few seconds.
  const fade = last.sticky ? 1 : Math.max(0, 1 - (last.age - 2.5) / 1.5);
  if (fade <= 0) return;
  ctx.font = `12px ${THEME.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const color = last.tone === "accent" ? THEME.accent : THEME.ink;
  ctx.fillStyle = `rgba(${color}, ${(0.9 * fade).toFixed(3)})`;
  ctx.fillText(last.text, cx, y);
  if (last.strike && last.text.startsWith(last.strike)) {
    const w = ctx.measureText(last.strike).width;
    const x0 = cx - ctx.measureText(last.text).width / 2;
    ctx.strokeStyle = `rgba(${color}, ${(0.9 * fade).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y + 7);
    ctx.lineTo(x0 + w, y + 7);
    ctx.stroke();
  }
}
