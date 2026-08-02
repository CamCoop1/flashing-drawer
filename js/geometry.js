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

export function computePoints(startPoint, segments) {
  if (!startPoint) return [];
  const dirs = cumulativeDirs(segments);
  const pts = [startPoint];
  let cur = startPoint;
  segments.forEach((seg, i) => {
    const rad = (dirs[i] * Math.PI) / 180;
    const lenPx = seg.length_mm * PX_PER_MM;
    cur = { x: cur.x + lenPx * Math.cos(rad), y: cur.y + lenPx * Math.sin(rad) };
    pts.push(cur);
  });
  return pts;
}

export function pointsFor(flashing) {
  if (!flashing) return [];
  return computePoints(flashing.startPoint, flashing.segments);
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


export function rotatePointsAroundCenter(pts, degrees) {
  if (!degrees || !pts.length) return pts;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return pts.map(p => {
    const dx = p.x - cx, dy = p.y - cy;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  });
}
