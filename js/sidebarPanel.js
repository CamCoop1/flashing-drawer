import { state, makeFlashing, parseRunLengths, getActive } from "./state.js";
import { draw, fitViewToActive } from "./renderer.js";
import { renderTable } from "./segmentTable.js";
import { updateHint } from "./interactions.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function renderFlashingList() {
  const list = document.getElementById("flashingList");
  list.innerHTML = "";

  if (!state.flashings.length) {
    list.innerHTML = `<p class="flashing-empty">No flashings yet — click "+ New" to add one.</p>`;
  }

  state.flashings.forEach(f => {
    const girth = f.segments.reduce((sum, s) => sum + s.length_mm, 0);
    const item = document.createElement("div");
    item.className = "flashing-item" + (f.id === state.activeId ? " active" : "");
    item.innerHTML = `
      <div class="swatch" style="background:${f.colourHex}"></div>
      <div class="info">
        <div class="name">${escapeHtml(f.name || "Untitled")}</div>
        <div class="meta">${f.segments.length} seg · ${Math.round(girth * 10) / 10}mm girth</div>
      </div>
      <button class="delBtn" data-id="${f.id}">✕</button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("delBtn")) return;
      selectFlashing(f.id);
    });
    item.querySelector(".delBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFlashing(f.id);
    });
    list.appendChild(item);
  });
}

export function selectFlashing(id) {
  state.activeId = id;
  renderFlashingList();
  syncDetailPanel();
  renderTable();
  fitViewToActive();
  updateHint();
}

export function deleteFlashing(id) {
  if (!confirm("Delete this flashing?")) return;
  state.flashings = state.flashings.filter(f => f.id !== id);
  if (state.activeId === id) {
    state.activeId = state.flashings.length ? state.flashings[0].id : null;
  }
  renderFlashingList();
  syncDetailPanel();
  renderTable();
  fitViewToActive();
  updateHint();
}

function updateLengthsPreview(rawStr) {
  const preview = document.getElementById("lengthsPreview");
  const parsed = parseRunLengths(rawStr);
  if (!parsed.length) {
    preview.textContent = rawStr ? "No valid pairs recognized yet." : "";
    return;
  }
  preview.textContent = "Parsed: " + parsed.map(p => `${p.qty} × ${p.length}`).join(", ");
}

export function syncDetailPanel() {
  const active = getActive();
  const panel = document.getElementById("detailPanel");
  const fields = ["fName", "fColourName", "fRunLengths"];

  if (!active) {
    panel.style.opacity = "0.5";
    fields.forEach(id => document.getElementById(id).value = "");
    document.getElementById("lengthsPreview").textContent = "";
    return;
  }
  panel.style.opacity = "1";
  document.getElementById("fName").value = active.name;
  document.getElementById("fColourName").value = active.colourName;
  document.getElementById("fRunLengths").value = active.run_lengths_raw || "";
  updateLengthsPreview(active.run_lengths_raw || "");
}

export function initSidebarPanel() {
  document.getElementById("addFlashingBtn").addEventListener("click", () => {
    const f = makeFlashing();
    state.flashings.push(f);
    selectFlashing(f.id);
  });

  document.getElementById("fName").addEventListener("input", (e) => {
    const active = getActive();
    if (!active) return;
    active.name = e.target.value;
    renderFlashingList();
  });

  document.getElementById("fColourName").addEventListener("input", (e) => {
    const active = getActive();
    if (!active) return;
    active.colourName = e.target.value;
  });

  document.getElementById("fRunLengths").addEventListener("input", (e) => {
    const active = getActive();
    if (!active) return;
    active.run_lengths_raw = e.target.value;
    updateLengthsPreview(e.target.value);
  });
}
