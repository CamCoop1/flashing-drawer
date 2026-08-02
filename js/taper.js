import { getActive } from "./state.js";
import { debouncedSaveFlashing } from "./db.js";
import { draw, fitViewToActive } from "./draw/index.js";
import { renderTable } from "./segmentTable.js";
import { updateHint } from "./interactions.js";

function updateTaperUI(flashing) {
  const toggleBtn = document.getElementById("taperToggleBtn");
  const sideButtons = document.getElementById("taperSideButtons");
  const nearBtn = document.getElementById("taperNearBtn");
  const farBtn = document.getElementById("taperFarBtn");

  if (!flashing || !flashing.taperEnabled) {
    toggleBtn.style.display = "inline-block";
    sideButtons.style.display = "none";
    return;
  }

  toggleBtn.style.display = "none";
  sideButtons.style.display = "flex";
  nearBtn.classList.toggle("active", flashing.taperSide === "near");
  farBtn.classList.toggle("active", flashing.taperSide === "far");
}

export function refreshTaperUI() {
  updateTaperUI(getActive());
}

function switchTaperSide(flashing, targetSide) {
  if (flashing.taperSide === targetSide) return;
  [flashing.segments, flashing.farSegments] = [flashing.farSegments, flashing.segments];
  [flashing.startPoint, flashing.farStartPoint] = [flashing.farStartPoint, flashing.startPoint];
  flashing.taperSide = targetSide;
}

export function initTaper() {
  document.getElementById("taperToggleBtn").addEventListener("click", () => {
    const active = getActive();
    if (!active) return;
    active.taperEnabled = true;
    active.taperSide = "near";
    active.farStartPoint = active.startPoint ? { ...active.startPoint } : null;
    active.farSegments = active.segments.map(s => ({ ...s }));
    updateTaperUI(active);
    draw();
    debouncedSaveFlashing(active);
  });

  document.getElementById("taperNearBtn").addEventListener("click", () => {
    const active = getActive();
    if (!active?.taperEnabled) return;
    switchTaperSide(active, "near");
    updateTaperUI(active);
    renderTable();
    draw();
    fitViewToActive();
    updateHint();
    debouncedSaveFlashing(active);
  });

  document.getElementById("taperFarBtn").addEventListener("click", () => {
    const active = getActive();
    if (!active?.taperEnabled) return;
    switchTaperSide(active, "far");
    updateTaperUI(active);
    renderTable();
    draw();
    fitViewToActive();
    updateHint();
    debouncedSaveFlashing(active);
  });
  document.getElementById("taperOffBtn").addEventListener("click", () => {
    const active = getActive();
    if (!active?.taperEnabled) return;
    if (!confirm("Turn off taper for this flashing? The far-side profile will be kept, so you can turn taper back on later without redrawing it.")) return;

    active.taperEnabled = false;
    updateTaperUI(active);
    fitViewToActive(); // restore normal zoom/position now that taper's extra zoom-out is no longer needed
    debouncedSaveFlashing(active);
  });
}
