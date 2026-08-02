import { canvas } from "../canvas.js";
import { ctx } from "../canvas.js";
import { state, PX_PER_MM } from "../state.js";
import { screenToWorld } from "../geometry.js";

export function drawGrid() {
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
}
