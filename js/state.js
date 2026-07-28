export const PX_PER_MM = 4;
export const SNAP_DEG = 45;
export const HIT_RADIUS = 20;
export const PALETTE = ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899"];

export const state = {
  flashings: [],
  activeId: null,
  mode: "draw",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragPreview: null,
  editingIndex: null,
  panning: false,
  panStart: null,
  panOffsetStart: null,
};

export function getActive() {
  return state.flashings.find(f => f.id === state.activeId) || null;
}

export function makeFlashing() {
  const n = state.flashings.length + 1;
  return {
    id: crypto.randomUUID(),
    name: `Flashing ${n}`,
    colourName: "",
    colourHex: PALETTE[(n - 1) % PALETTE.length], // internal only, no picker UI
    run_lengths_raw: "",   // e.g. "1/3.000 2/2.450"
    startPoint: null,
    segments: [],
  };
}

// Parses "1/3.000 2/2.450" into [{qty: 1, length: "3.000"}, {qty: 2, length: "2.450"}]
// Length is kept as the original typed string to avoid mangling decimal notation.
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
