import { state, PX_PER_MM, SNAP_DEG, getActive } from "./state.js";

export function cumulativeDirs(segments) {
  const dirs = [];
  let cur = 0;
  segments.forEach((seg, i) => {
    cur = i === 0 ? seg.rel_angle_deg : cur + seg.rel_angle_deg;
    dirs.push(cur);
  });
  return dirs;
}

export function pointsFor(flashing) {
  if (!flashing || !flashing.startPoint) return [];
  const dirs = cumulativeDirs(flashing.segments);
  const pts = [flashing.startPoint];
  let cur = flashing.startPoint;
  flashing.segments.forEach((seg, i) => {
    const rad = (dirs[i] * Math.PI) / 180;
    const lenPx = seg.length_mm * PX_PER_MM;
    cur = { x: cur.x + lenPx * Math.cos(rad), y: cur.y + lenPx * Math.sin(rad) };
    pts.push(cur);
  });
  return pts;
}

export function points() {
  return pointsFor(getActive());
}

export function snapRel(deg) {
  let d = ((deg % 360) + 360) % 360;
  let snapped = (Math.round(d / SNAP_DEG) * SNAP_DEG) % 360;
  if (snapped > 180) snapped -= 360;
  return snapped;
}

export function turnToInterior(turnDeg) {
  return Math.round((180 - Math.abs(turnDeg)) * 10) / 10;
}

export function interiorToTurn(interiorDeg, currentTurnDeg) {
  const sign = Math.sign(currentTurnDeg) || 1;
  const magnitude = 180 - interiorDeg;
  return magnitude === 0 ? 0 : sign * magnitude;
}

export function displayAngleFor(flashing, i) {
  if (i === 0) return 0;
  return turnToInterior(flashing.segments[i].rel_angle_deg);
}

export function worldToScreen(p) {
  return { x: p.x * state.scale + state.offsetX, y: p.y * state.scale + state.offsetY };
}

export function screenToWorld(p) {
  return { x: (p.x - state.offsetX) / state.scale, y: (p.y - state.offsetY) / state.scale };
}

export function getRawCanvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}
