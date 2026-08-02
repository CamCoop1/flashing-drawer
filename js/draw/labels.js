import { ctx } from "../canvas.js";

export function drawLengthLabels(frame) {
  const { active, pts, screenPts } = frame;
  if (!active || pts.length <= 1) return;

  ctx.font = "13px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < active.segments.length; i++) {
    const a = screenPts[i];
    const b = screenPts[i + 1];
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
