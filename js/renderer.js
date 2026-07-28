import { canvas, ctx } from "./canvas.js";
import { state, PX_PER_MM, getActive } from "./state.js";
import { points, pointsFor, worldToScreen, screenToWorld } from "./geometry.js";

export function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(state.offsetX, state.offsetY);
  ctx.scale(state.scale, state.scale);

  ctx.strokeStyle = "#eee";
  ctx.lineWidth = 1 / state.scale;
  const gridStep = 20 * PX_PER_MM;
  const worldTL = screenToWorld({ x: 0, y: 0 });
  const worldBR = screenToWorld({ x: canvas.width, y: canvas.height });
  for (let x = Math.floor(worldTL.x / gridStep) * gridStep; x < worldBR.x; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, worldTL.y); ctx.lineTo(x, worldBR.y); ctx.stroke();
  }
  for (let y = Math.floor(worldTL.y / gridStep) * gridStep; y < worldBR.y; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(worldTL.x, y); ctx.lineTo(worldBR.x, y); ctx.stroke();
  }

  const active = getActive();
  const pts = points();
  const strokeColour = active ? active.colourHex : "#3b82f6";

  if (pts.length) {
    ctx.strokeStyle = strokeColour;
    ctx.lineWidth = 3 / state.scale;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (state.dragging && state.mode === "draw" && state.dragPreview) {
      ctx.lineTo(state.dragPreview.x, state.dragPreview.y);
    }
    ctx.stroke();

    ctx.fillStyle = "#111";
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 / state.scale, 0, Math.PI * 2);
      ctx.fill();
    });

    if (state.dragging && state.mode === "draw" && state.dragPreview) {
      ctx.fillStyle = strokeColour;
      ctx.beginPath();
      ctx.arc(state.dragPreview.x, state.dragPreview.y, 5 / state.scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  if (active && pts.length > 1) {
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < active.segments.length; i++) {
      const a = worldToScreen(pts[i]);
      const b = worldToScreen(pts[i + 1]);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const labelX = midX + nx * 14;
      const labelY = midY + ny * 14;

      const text = `${active.segments[i].length_mm} mm`;
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(labelX - textWidth / 2 - 4, labelY - 9, textWidth + 8, 18);
      ctx.fillStyle = "#111";
      ctx.fillText(text, labelX, labelY);
    }
  }

  if (state.dragging && state.mode === "draw" && state.dragPreview && pts.length) {
    const last = pts[pts.length - 1];
    const a = worldToScreen(last);
    const b = worldToScreen(state.dragPreview);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dist = Math.hypot(state.dragPreview.x - last.x, state.dragPreview.y - last.y);
    const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

    const text = `${lengthMM} mm`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(59,130,246,0.9)";
    ctx.fillRect(midX - textWidth / 2 - 4, midY - 9, textWidth + 8, 18);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, midX, midY);
  }

  if (!active) {
    ctx.fillStyle = "#999";
    ctx.font = "14px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Select or create a flashing to start drawing", canvas.width / 2, canvas.height / 2);
  }
}

export function fitViewToActive() {
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
  state.scale = s;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  state.offsetX = canvas.width / 2 - cx * state.scale;
  state.offsetY = canvas.height / 2 - cy * state.scale;
  draw();
}

export function renderFlashingThumbnail(flashing, pxWidth, pxHeight) {
  const off = document.createElement("canvas");
  off.width = pxWidth;
  off.height = pxHeight;
  const octx = off.getContext("2d");

  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, pxWidth, pxHeight);

  const pts = pointsFor(flashing);
  if (!pts.length) {
    octx.fillStyle = "#999";
    octx.font = "14px sans-serif";
    octx.textAlign = "center";
    octx.fillText("No profile drawn", pxWidth / 2, pxHeight / 2);
    return off;
  }

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = 40;
  const fitScale = Math.min((pxWidth - pad * 2) / w, (pxHeight - pad * 2) / h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const ox = pxWidth / 2 - cx * fitScale;
  const oy = pxHeight / 2 - cy * fitScale;

  const toLocal = (p) => ({ x: p.x * fitScale + ox, y: p.y * fitScale + oy });
  const localPts = pts.map(toLocal);

  octx.strokeStyle = flashing.colourHex;
  octx.lineWidth = 3;
  octx.beginPath();
  octx.moveTo(localPts[0].x, localPts[0].y);
  for (let i = 1; i < localPts.length; i++) octx.lineTo(localPts[i].x, localPts[i].y);
  octx.stroke();

  octx.fillStyle = "#111";
  localPts.forEach(p => {
    octx.beginPath();
    octx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    octx.fill();
  });

  octx.font = "12px -apple-system, sans-serif";
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  for (let i = 0; i < flashing.segments.length; i++) {
    const a = localPts[i], b = localPts[i + 1];
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const labelX = midX + nx * 12, labelY = midY + ny * 12;
    const text = `${flashing.segments[i].length_mm}`;
    const tw = octx.measureText(text).width;
    octx.fillStyle = "rgba(255,255,255,0.9)";
    octx.fillRect(labelX - tw / 2 - 3, labelY - 8, tw + 6, 16);
    octx.fillStyle = "#111";
    octx.fillText(text, labelX, labelY);
  }

  return off;
}
