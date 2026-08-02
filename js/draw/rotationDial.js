import { ctx } from "../canvas.js";

const DIAL_CENTER = { x: 50, y: 50 };
const DIAL_RADIUS = 28;

export function drawRotationDial(frame) {
  const { active } = frame;
  const { x: cx, y: cy } = DIAL_CENTER;

  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, DIAL_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.arc(cx, cy, DIAL_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  const rot = active?.rotationDeg || 0;
  const rad = ((rot - 90) * Math.PI) / 180;
  const dotX = cx + DIAL_RADIUS * Math.cos(rad);
  const dotY = cy + DIAL_RADIUS * Math.sin(rad);

  ctx.fillStyle = "#3b82f6";
  ctx.beginPath();
  ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function getDialHit(rawPos) {
  const dx = rawPos.x - DIAL_CENTER.x;
  const dy = rawPos.y - DIAL_CENTER.y;
  const dist = Math.hypot(dx, dy);
  return dist >= DIAL_RADIUS - 14 && dist <= DIAL_RADIUS + 14;
}

export function angleFromDial(rawPos) {
  const dx = rawPos.x - DIAL_CENTER.x;
  const dy = rawPos.y - DIAL_CENTER.y;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  deg = ((deg % 360) + 360) % 360;
  return deg;
}
