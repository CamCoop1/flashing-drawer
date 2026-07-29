export const PX_PER_MM = 4;
export const SNAP_DEG = 45;
export const HIT_RADIUS = 20;
export const PALETTE = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];

const STORAGE_KEY = "flashingProjects";

export const state = {
  projects: [],
  activeProjectId: null,
  activeFlashingId: null,
  mode: "draw",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragFromStart: false,   // true when the current drag is prepending a segment at the start
  dragPreview: null,
  editingIndex: null,
  panning: false,
  panStart: null,
  panOffsetStart: null,
};

export function getActiveProject() {
  return state.projects.find(p => p.id === state.activeProjectId) || null;
}

export function getActive() {
  const project = getActiveProject();
  if (!project) return null;
  return project.flashings.find(f => f.id === state.activeFlashingId) || null;
}

export function makeProject(name, poNumber) {
  return {
    id: crypto.randomUUID(),
    name: name || "Untitled Project",
    poNumber: poNumber || "",
    flashings: [],
  };
}

export function makeFlashing(project) {
  const n = (project?.flashings.length || 0) + 1;
  return {
    id: crypto.randomUUID(),
    name: `Flashing ${n}`,
    colourName: "",
    colourHex: PALETTE[(n - 1) % PALETTE.length],
    colouredSide: null,
    run_lengths_raw: "",
    startPoint: null,
    segments: [],
  };
}

export function parseRunLengths(str) {
  if (!str) return [];
  const regex = /(\d+)\s*\/\s*([\d.]+)/g;
  const results = [];
  let match;
  while ((match = regex.exec(str)) !== null) {
    results.push({ qty: parseInt(match[1], 10), length: match[2] });
  }
  return results;
}

export function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects));
}

export function loadProjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    state.projects = JSON.parse(raw);
    state.projects.forEach(p => {
      p.flashings.forEach(f => {
        if (f.colouredSide === undefined) f.colouredSide = null;
      });
    });
  } catch {
    state.projects = [];
  }
}
