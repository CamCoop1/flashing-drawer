import { ctx } from "../canvas.js";
import { state, PX_PER_MM } from "../state.js";
import { worldToScreen } from "../geometry.js";

export function drawDragPreviewLabel(frame) {
  const { pts } = frame;
  if (!(state.dragging && state.mode === "draw" && state.dragPreview && pts.length)) return;

  const anchor = state.dragFromStart ? pts[0] : pts[pts.length - 1];
  const a = worldToScreen(anchor);
  const b = worldToScreen(state.dragPreview);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const dist = Math.hypot(state.dragPreview.x - anchor.x, state.dragPreview.y - anchor.y);
  const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

  const text = `${lengthMM} mm`;
  const textWidth = ctx.measureText(text).width;
  ctx.fillStyle = "rgba(59,130,246,0.9)";
  ctx.fillRect(midX - textWidth / 2 - 4, midY - 9, textWidth + 8, 18);
  ctx.fillStyle = "#fff";
  ctx.fillText(text, midX, midY);
}
