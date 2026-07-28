import { canvas } from "./canvas.js";
import { state, PX_PER_MM, getActive } from "./state.js";
import { points, cumulativeDirs, snapRel, worldToScreen, screenToWorld, getRawCanvasPos } from "./geometry.js";
import { draw, fitViewToActive } from "./renderer.js";
import { renderTable } from "./segmentTable.js";
import { renderFlashingList } from "./sidebarPanel.js";

const HIT_RADIUS = 20;

function nearestVertex(rawPos) {
  const pts = points();
  for (let i = 0; i < pts.length; i++) {
    const screenPt = worldToScreen(pts[i]);
    if (Math.hypot(rawPos.x - screenPt.x, rawPos.y - screenPt.y) < HIT_RADIUS) return i;
  }
  return null;
}

function onDown(e) {
  const active = getActive();
  if (!active) return;
  const rawPos = getRawCanvasPos(e, canvas);

  if (state.mode === "pan") {
    state.panning = true;
    state.panStart = rawPos;
    state.panOffsetStart = { x: state.offsetX, y: state.offsetY };
    return;
  }

  if (state.mode === "edit") {
    const idx = nearestVertex(rawPos);
    if (idx !== null) state.editingIndex = idx;
    return;
  }

  if (!active.startPoint) {
    active.startPoint = screenToWorld(rawPos);
    draw();
    updateHint();
    renderFlashingList();
    return;
  }
  const pts = points();
  const last = pts[pts.length - 1];
  const lastScreen = worldToScreen(last);
  if (Math.hypot(rawPos.x - lastScreen.x, rawPos.y - lastScreen.y) > HIT_RADIUS) return;

  state.dragging = true;
  state.dragPreview = { ...last };
}

function onMove(e) {
  const active = getActive();
  if (!active) return;
  const rawPos = getRawCanvasPos(e, canvas);

  if (state.mode === "pan" && state.panning) {
    state.offsetX = state.panOffsetStart.x + (rawPos.x - state.panStart.x);
    state.offsetY = state.panOffsetStart.y + (rawPos.y - state.panStart.y);
    draw();
    return;
  }

  if (state.mode === "edit" && state.editingIndex !== null) {
    const worldPos = screenToWorld(rawPos);
    const pts = points();
    const anchor = pts[state.editingIndex - 1];

    if (!anchor) {
      active.startPoint = worldPos;
      draw();
      renderTable();
      return;
    }

    const dirs = cumulativeDirs(active.segments);
    const prevDirRef = state.editingIndex - 2 >= 0 ? dirs[state.editingIndex - 2] : 0;
    const rawAngle = (Math.atan2(worldPos.y - anchor.y, worldPos.x - anchor.x) * 180) / Math.PI;
    const relAngle = snapRel(rawAngle - prevDirRef);
    const dist = Math.hypot(worldPos.x - anchor.x, worldPos.y - anchor.y);
    const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

    active.segments[state.editingIndex - 1] = { length_mm: Math.max(lengthMM, 0.1), rel_angle_deg: relAngle };
    draw();
    renderTable();
    return;
  }

  if (state.mode === "draw" && state.dragging) {
    const worldPos = screenToWorld(rawPos);
    const pts = points();
    const last = pts[pts.length - 1];
    const dirs = cumulativeDirs(active.segments);
    const prevDir = dirs.length ? dirs[dirs.length - 1] : 0;

    const rawAngle = (Math.atan2(worldPos.y - last.y, worldPos.x - last.x) * 180) / Math.PI;
    const relAngle = snapRel(rawAngle - prevDir);
    const dist = Math.hypot(worldPos.x - last.x, worldPos.y - last.y);
    const snappedAbs = prevDir + relAngle;
    const rad = (snappedAbs * Math.PI) / 180;

    state.dragPreview = { x: last.x + dist * Math.cos(rad), y: last.y + dist * Math.sin(rad) };
    draw();
  }
}

function onUp() {
  const active = getActive();
  if (state.mode === "pan") { state.panning = false; return; }
  if (state.mode === "edit") { state.editingIndex = null; return; }

  if (state.mode === "draw" && state.dragging && active) {
    const pts = points();
    const last = pts[pts.length - 1];
    const dist = Math.hypot(state.dragPreview.x - last.x, state.dragPreview.y - last.y);
    const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

    if (lengthMM >= 1) {
      const dirs = cumulativeDirs(active.segments);
      const prevDir = dirs.length ? dirs[dirs.length - 1] : 0;
      const rawAngle = (Math.atan2(state.dragPreview.y - last.y, state.dragPreview.x - last.x) * 180) / Math.PI;
      const relAngle = snapRel(rawAngle - prevDir);
      active.segments.push({ length_mm: lengthMM, rel_angle_deg: relAngle });
      renderTable();
      renderFlashingList();
    }
    state.dragging = false;
    state.dragPreview = null;
    draw();
    updateHint();
  }
}

function setMode(m) {
  state.mode = m;
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("mode" + m[0].toUpperCase() + m.slice(1)).classList.add("active");
  updateHint();
}

export function updateHint() {
  const hint = document.getElementById("hint");
  const active = getActive();
  if (!active) {
    hint.textContent = "Add a flashing on the right, then click the canvas to start drawing.";
  } else if (state.mode === "pan") {
    hint.textContent = "Drag anywhere to pan the view.";
  } else if (state.mode === "edit") {
    hint.textContent = "Drag any existing point to reshape the profile. Snaps to 45° turns.";
  } else if (!active.startPoint) {
    hint.textContent = "Click anywhere on the canvas to place your starting point.";
  } else {
    hint.textContent = "Drag from the end-point to draw the next segment. Snaps to 45° turns.";
  }
}

export function initInteractions() {
  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseup", onUp);
  canvas.addEventListener("mouseleave", onUp);
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); onDown(e); });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); onMove(e); });
  canvas.addEventListener("touchend", (e) => { e.preventDefault(); onUp(e); });

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rawPos = getRawCanvasPos(e, canvas);
    const worldBefore = screenToWorld(rawPos);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    state.scale = Math.min(Math.max(state.scale * factor, 0.2), 5);
    state.offsetX = rawPos.x - worldBefore.x * state.scale;
    state.offsetY = rawPos.y - worldBefore.y * state.scale;
    draw();
  });

  document.getElementById("modeDraw").addEventListener("click", () => setMode("draw"));
  document.getElementById("modeEdit").addEventListener("click", () => setMode("edit"));
  document.getElementById("modePan").addEventListener("click", () => setMode("pan"));

  document.getElementById("zoomInBtn").addEventListener("click", () => {
    state.scale = Math.min(state.scale * 1.2, 5);
    draw();
  });
  document.getElementById("zoomOutBtn").addEventListener("click", () => {
    state.scale = Math.max(state.scale * 0.8, 0.2);
    draw();
  });
  document.getElementById("zoomResetBtn").addEventListener("click", fitViewToActive);

  document.getElementById("undoBtn").addEventListener("click", () => {
    const active = getActive();
    if (!active) return;
    active.segments.pop();
    renderTable();
    draw();
    renderFlashingList();
  });

  document.getElementById("clearShapeBtn").addEventListener("click", () => {
    const active = getActive();
    if (!active) return;
    if (!confirm("Clear this flashing's shape? (Name/colour/length are kept)")) return;
    active.startPoint = null;
    active.segments = [];
    renderTable();
    draw();
    renderFlashingList();
    updateHint();
  });
}
