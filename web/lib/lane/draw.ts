/**
 * Draw a LaneModel onto a 2D canvas context. Plain arcs, lines and text: no filters,
 * no shadows, no gradients. Everything is derived from the model; the renderer keeps
 * no state of its own.
 */

import { type LaneModel, type Marker, WALL_FLASH_SECONDS } from "@/lib/lane/model";

export const THEME = {
  ink: "#ededed",
  inkDim: "rgba(237, 237, 237, 0.35)",
  inkFaint: "rgba(237, 237, 237, 0.14)",
  accent: "#f5b301",
  accentDim: "rgba(245, 179, 1, 0.45)",
  mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

/** Distance from the center line to each lane edge. */
export const LANE_HALF = 34;
const MARKER_R = 6;
const TICK_STEP = 500;

export type DrawSize = { width: number; height: number };

export function draw(ctx: CanvasRenderingContext2D, model: LaneModel, size: DrawSize): void {
  const { width, height } = size;
  const cy = Math.round(height * 0.5);
  ctx.clearRect(0, 0, width, height);

  const faded = model.state === "failed" || model.state === "idle";
  ctx.globalAlpha = faded ? 0.55 : 1;

  drawEdges(ctx, width, cy);
  drawCenterLine(ctx, model, width, cy);
  drawAxis(ctx, model, width, cy);

  ctx.globalAlpha = 1;
  drawWave(ctx, model.agentWave, width, cy - LANE_HALF * 0.55, 1, THEME.ink);
  drawWave(ctx, model.userWave, width, cy + LANE_HALF * 0.55, -1, THEME.inkDim);

  for (const f of model.flashes) drawWallFlash(ctx, f.x, f.age, cy);
  for (const m of model.markers) drawMarker(ctx, m, cy);
}

function drawEdges(ctx: CanvasRenderingContext2D, width: number, cy: number): void {
  ctx.strokeStyle = THEME.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cy - LANE_HALF + 0.5);
  ctx.lineTo(width, cy - LANE_HALF + 0.5);
  ctx.moveTo(0, cy + LANE_HALF + 0.5);
  ctx.lineTo(width, cy + LANE_HALF + 0.5);
  ctx.stroke();
}

function drawCenterLine(
  ctx: CanvasRenderingContext2D,
  model: LaneModel,
  width: number,
  cy: number,
): void {
  const breathing = model.state === "thinking" || model.state === "connecting";
  const alpha = breathing ? 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(model.clock * 3)) : 0.35;
  ctx.strokeStyle = `rgba(237, 237, 237, ${alpha})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([14, 18]);
  ctx.lineDashOffset = -model.dashOffset;
  ctx.beginPath();
  ctx.moveTo(0, cy + 0.5);
  ctx.lineTo(width, cy + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawAxis(
  ctx: CanvasRenderingContext2D,
  model: LaneModel,
  width: number,
  cy: number,
): void {
  ctx.font = `11px ${THEME.mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const y = cy + LANE_HALF + 10;
  for (let amount = model.window.min; amount <= model.window.max; amount += TICK_STEP) {
    const x = Math.round(model.scale(amount)) + 0.5;
    const major = amount % 1000 === 0;
    ctx.strokeStyle = major ? THEME.inkDim : THEME.inkFaint;
    ctx.beginPath();
    ctx.moveTo(x, cy + LANE_HALF + 1);
    ctx.lineTo(x, cy + LANE_HALF + (major ? 7 : 4));
    ctx.stroke();
    if (major) {
      ctx.fillStyle = THEME.inkDim;
      const label = `$${amount / 1000}k`;
      // Keep the first and last labels inside the canvas.
      const align = x < 20 ? "left" : x > width - 20 ? "right" : "center";
      ctx.textAlign = align;
      ctx.fillText(label, x, y);
      ctx.textAlign = "center";
    }
  }
}

/**
 * A voice wave along the lane. `direction` 1 draws newest samples at the right
 * (sound travelling left → right, the agent); -1 mirrors it for the carrier.
 */
function drawWave(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  width: number,
  baseY: number,
  direction: 1 | -1,
  color: string,
): void {
  const n = samples.length;
  const amp = LANE_HALF * 0.42;
  let any = false;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    if (s > 0.02) any = true;
    const t = i / (n - 1);
    const x = direction === 1 ? t * width : (1 - t) * width;
    // A carrier sine whose amplitude is the voice level: reads as sound, not noise.
    const y = baseY + Math.sin(i * 0.55) * s * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  if (any) ctx.stroke();
}

function drawWallFlash(ctx: CanvasRenderingContext2D, x: number, age: number, cy: number): void {
  const t = 1 - age / WALL_FLASH_SECONDS;
  ctx.strokeStyle = `rgba(245, 179, 1, ${0.9 * t})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.round(x) + 0.5, cy - LANE_HALF - 24 * t);
  ctx.lineTo(Math.round(x) + 0.5, cy + LANE_HALF + 24 * t);
  ctx.stroke();
}

function drawMarker(ctx: CanvasRenderingContext2D, m: Marker, cy: number): void {
  const x = m.x;
  const y = cy + m.y;
  let alpha = 1;
  if (m.phase === "fallen") alpha = Math.max(0.15, 0.6 - m.age * 0.08);
  else if (m.phase === "bouncing") alpha = 0.9;

  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, MARKER_R, 0, Math.PI * 2);
  if (m.phase === "locked") {
    ctx.fillStyle = THEME.accent;
    ctx.fill();
  } else if (m.phase === "fallen") {
    ctx.strokeStyle = THEME.inkDim;
    ctx.stroke();
  } else {
    ctx.strokeStyle = THEME.accent;
    ctx.stroke();
  }

  // Amount label: above the lane for markers on it, under the marker once fallen.
  // Keeping labels outside the lane leaves the waves uncluttered.
  if (m.phase === "hanging" || m.phase === "locked" || m.phase === "fallen") {
    ctx.font = `11px ${THEME.mono}`;
    ctx.textAlign = "center";
    ctx.fillStyle = m.phase === "fallen" ? THEME.inkDim : THEME.accent;
    const label = `$${m.amount.toLocaleString("en-US")}`;
    if (m.phase === "fallen") {
      ctx.textBaseline = "top";
      ctx.fillText(label, x, y + MARKER_R + 4);
    } else {
      ctx.textBaseline = "bottom";
      ctx.fillText(label, x, cy - LANE_HALF - 6);
    }
  }
  ctx.globalAlpha = 1;
}
