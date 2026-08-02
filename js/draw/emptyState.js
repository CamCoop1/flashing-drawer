import { ctx, canvas } from "../canvas.js";

export function drawEmptyState(frame) {
  if (frame.active) return;
  ctx.fillStyle = "#999";
  ctx.font = "14px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Select or create a flashing to start drawing", canvas.width / 2, canvas.height / 2);
}
