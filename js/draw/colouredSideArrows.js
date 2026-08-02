import { ctx } from "../canvas.js";

export function drawSideArrowsScreenSpace(targetCtx, flashing, screenPts, offsetDist) {
  const side = flashing.colouredSide;
  if (side !== 1 && side !== -1) return;

  const stemLength = 22;
  const arrowLength = 14;
  const arrowWidth = 7;

  targetCtx.fillStyle = "#ff0000";
  targetCtx.strokeStyle = "#ff0000";
  targetCtx.lineWidth = 2;

  for (let i = 0; i < flashing.segments.length; i++) {
    const a = screenPts[i];
    const b = screenPts[i + 1];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * side;
    const ny = (dx / len) * side;

    const stemStartX = midX + nx * offsetDist;
    const stemStartY = midY + ny * offsetDist;
    const stemEndX = midX + nx * (offsetDist + stemLength);
    const stemEndY = midY + ny * (offsetDist + stemLength);

    targetCtx.beginPath();
    targetCtx.moveTo(stemStartX, stemStartY);
    targetCtx.lineTo(stemEndX, stemEndY);
    targetCtx.stroke();

    const tipX = midX + nx * (offsetDist + stemLength + arrowLength);
    const tipY = midY + ny * (offsetDist + stemLength + arrowLength);
    const px = -dy / len, py = dx / len;

    targetCtx.beginPath();
    targetCtx.moveTo(tipX, tipY);
    targetCtx.lineTo(stemEndX + px * arrowWidth, stemEndY + py * arrowWidth);
    targetCtx.lineTo(stemEndX - px * arrowWidth, stemEndY - py * arrowWidth);
    targetCtx.closePath();
    targetCtx.fill();
  }
}

export function drawColouredSideArrows(frame) {
  const { active, screenPts } = frame;
  if (!active || screenPts.length < 2) return;
  drawSideArrowsScreenSpace(ctx, active, screenPts, 20);
}
