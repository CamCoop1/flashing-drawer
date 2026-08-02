import { canvas, ctx } from "../canvas.js";
import { state, getActive } from "../state.js";
import { points, worldToScreen, rotatePointsAroundCenter } from "../geometry.js";

import { drawGrid } from "./grid.js";
import { drawProfile } from "./profile.js";
import { drawLengthLabels } from "./labels.js";
import { drawTaperLines } from "./taper.js";
import { drawColouredSideArrows } from "./colouredSideArrows.js";
import { drawDragPreviewLabel } from "./dragPreview.js";
import { drawEmptyState } from "./emptyState.js";
import { drawRotationDial } from "./rotationDial.js";

function buildFrame() {
  const active = getActive();
  const pts = points(); // raw, unrotated — profile.js applies its own rotation transform internally
  const rotatedPts = rotatePointsAroundCenter(pts, active?.rotationDeg || 0);
  const screenPts = rotatedPts.map(worldToScreen); // rotated, used by all screen-space layers
  return { active, pts, screenPts, strokeColour: active ? active.colourHex : "#3b82f6" };
}

const WORLD_SPACE_LAYERS = [drawGrid, drawProfile];

const SCREEN_SPACE_LAYERS = [
  drawLengthLabels,
  drawTaperLines,
  drawColouredSideArrows,
  drawDragPreviewLabel,
  drawEmptyState,
  drawRotationDial,
];

export function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const frame = buildFrame();

  ctx.save();
  ctx.translate(state.offsetX, state.offsetY);
  ctx.scale(state.scale, state.scale);
  WORLD_SPACE_LAYERS.forEach(layer => layer(frame));
  ctx.restore();

  SCREEN_SPACE_LAYERS.forEach(layer => layer(frame));
}

export function fitViewToActive() {
  const active = getActive();
  const pts = points();
  if (!pts.length) {
    state.scale = 1; state.offsetX = 0; state.offsetY = 0;
    draw();
    return;
  }

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = 60;

  let s = Math.min((canvas.width - pad * 2) / w, (canvas.height - pad * 2) / h);
  s = Math.min(s, 5);
  s = Math.max(s, 0.2);

  if (active?.taperEnabled) {
    s *= 0.75;
  }

  state.scale = s;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  state.offsetX = canvas.width / 2 - cx * state.scale;
  state.offsetY = canvas.height / 2 - cy * state.scale;
  draw();
}
