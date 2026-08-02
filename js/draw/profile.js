import { ctx } from "../canvas.js";
import { state } from "../state.js";

export function drawProfile(frame) {
  const { active, pts, strokeColour } = frame;
  if (!pts.length) return;

  ctx.save();

  if (active?.rotationDeg) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    ctx.translate(cx, cy);
    ctx.rotate((active.rotationDeg * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.strokeStyle = strokeColour;
  ctx.lineWidth = 3 / state.scale;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (state.dragging && state.mode === "draw" && state.dragPreview && !state.dragFromStart) {
    ctx.lineTo(state.dragPreview.x, state.dragPreview.y);
  }
  ctx.stroke();

  if (state.dragging && state.mode === "draw" && state.dragPreview && state.dragFromStart) {
    ctx.beginPath();
    ctx.moveTo(state.dragPreview.x, state.dragPreview.y);
    ctx.lineTo(pts[0].x, pts[0].y);
    ctx.stroke();
  }

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

  ctx.restore();
}
