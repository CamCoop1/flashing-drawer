import { state, makeFlashing, parseRunLengths, getActive, getActiveProject } from "./state.js";
import { createFlashingRow, deleteFlashingRow, debouncedSaveFlashing } from "./db.js";
import { draw, fitViewToActive } from "./renderer.js";
import { renderTable } from "./segmentTable.js";
import { updateHint } from "./interactions.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function renderFlashingList() {
  const project = getActiveProject();
  const list = document.getElementById("flashingList");
  list.innerHTML = "";

  if (!project || !project.flashings.length) {
    list.innerHTML = `<p class="flashing-empty">No flashings yet — click "+ New" to add one.</p>`;
    return;
  }

  project.flashings.forEach(f => {
    const girth = f.segments.reduce((sum, s) => sum + s.length_mm, 0);
    const item = document.createElement("div");
    item.className = "flashing-item" + (f.id === state.activeFlashingId ? " active" : "");
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
  state.activeFlashingId = id;
  renderFlashingList();
  syncDetailPanel();
  renderTable();
  fitViewToActive();
  updateHint();
}

export async function deleteFlashing(id) {
  const project = getActiveProject();
  if (!project) return;
  if (!confirm("Delete this flashing?")) return;

  try {
    await deleteFlashingRow(id);
    project.flashings = project.flashings.filter(f => f.id !== id);
    if (state.activeFlashingId === id) {
      state.activeFlashingId = project.flashings.length ? project.flashings[0].id : null;
    }
    renderFlashingList();
    syncDetailPanel();
    renderTable();
    fitViewToActive();
    updateHint();
  } catch (err) {
    alert(`Couldn't delete flashing: ${err.message}`);
  }
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

function updateSideToggleUI(flashing) {
  const arrowLeft = document.getElementById("arrowLeft");
  const arrowRight = document.getElementById("arrowRight");
  const caption = document.querySelector(".side-toggle-caption");

  if (!flashing) {
    arrowLeft.classList.remove("active");
    arrowRight.classList.remove("active");
    if (caption) caption.textContent = "Coloured side";
    return;
  }

  const side = flashing.colouredSide;
  arrowRight.classList.toggle("active", side === 1);
  arrowLeft.classList.toggle("active", side === -1);

  if (caption) {
    caption.textContent =
      side === 1 ? "Coloured side: right" :
      side === -1 ? "Coloured side: left" :
      "Coloured side: none";
  }
}

export function syncDetailPanel() {
  const active = getActive();
  const panel = document.getElementById("detailPanel");
  const fields = ["fName", "fColourName", "fRunLengths"];

  if (!active) {
    panel.style.opacity = "0.5";
    fields.forEach(id => document.getElementById(id).value = "");
    document.getElementById("lengthsPreview").textContent = "";
    updateSideToggleUI(null);
    return;
  }
  panel.style.opacity = "1";
  document.getElementById("fName").value = active.name;
  document.getElementById("fColourName").value = active.colourName;
  document.getElementById("fRunLengths").value = active.run_lengths_raw || "";
  updateLengthsPreview(active.run_lengths_raw || "");
  updateSideToggleUI(active);
}

export function initSidebarPanel() {
  document.getElementById("addFlashingBtn").addEventListener("click", async () => {
    const project = getActiveProject();
    if (!project) return;
    const f = makeFlashing(project);
    try {
      const row = await createFlashingRow(project.id, f, project.flashings.length);
      f.id = row.id;
      project.flashings.push(f);
      selectFlashing(f.id);
    } catch (err) {
      alert(`Couldn't create flashing: ${err.message}`);
    }
  });

  document.getElementById("fName").addEventListener("input", (e) => {
    const active = getActive();
    if (!active) return;
    active.name = e.target.value;
    renderFlashingList();
    debouncedSaveFlashing(active);
  });

  document.getElementById("fColourName").addEventListener("input", (e) => {
    const active = getActive();
    if (!active) return;
    active.colourName = e.target.value;
    debouncedSaveFlashing(active);
  });

  document.getElementById("fRunLengths").addEventListener("input", (e) => {
    const active = getActive();
    if (!active) return;
    active.run_lengths_raw = e.target.value;
    updateLengthsPreview(e.target.value);
    debouncedSaveFlashing(active);
  });

  document.getElementById("colouredSideToggle").addEventListener("click", () => {
    const active = getActive();
    if (!active) return;
    if (active.colouredSide === null || active.colouredSide === undefined) {
      active.colouredSide = 1;
    } else if (active.colouredSide === 1) {
      active.colouredSide = -1;
    } else {
      active.colouredSide = null;
    }
    updateSideToggleUI(active);
    draw();
    debouncedSaveFlashing(active);
  });
}
