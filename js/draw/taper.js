import { ctx, canvas } from "../canvas.js";

export function drawTaperLines(frame) {
  const { active, screenPts } = frame;
  if (!active?.taperEnabled || screenPts.length < 2) return;

  const dir = active.taperSide === "near"
    ? { x: 0.35, y: -1 }
    : { x: -0.35, y: 1 };
  const mag = Math.hypot(dir.x, dir.y);
  const unit = { x: dir.x / mag, y: dir.y / mag };
  const lineLength = Math.max(canvas.width, canvas.height) * 0.9;

  ctx.save();
  ctx.strokeStyle = "rgba(128,128,128,0.75)";
  ctx.lineWidth = 3;
  ctx.setLineDash([]); // solid line

  screenPts.forEach(p => {
    const endX = p.x + unit.x * lineLength;
    const endY = p.y + unit.y * lineLength;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  });

  ctx.restore();

  const labelAnchor = screenPts[0];
  const labelX = labelAnchor.x + unit.x * (lineLength + 10);
  const labelY = labelAnchor.y + unit.y * (lineLength + 10);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(active.taperSide === "near" ? "Near side" : "Far side", labelX, labelY);
}
