import { refreshTaperUI } from "./taper.js";
import { state, makeFlashing, parseRunLengths, getActive, getActiveProject } from "./state.js";
import { createFlashingRow, deleteFlashingRow, debouncedSaveFlashing, createTemplateRow, fetchCustomTemplates, deleteTemplateRow} from "./db.js";
import { draw, fitViewToActive, renderFlashingThumbnail } from "./draw/index.js";
import { renderTable } from "./segmentTable.js";
import { updateHint } from "./interactions.js";
import { currentUser } from "./auth.js";
import { FLASHING_TEMPLATES, cloneTemplate } from "./templates.js";

let cachedCustomTemplates = null; // null = not yet fetched this session

async function getCustomTemplates(forceRefresh = false) {
  if (cachedCustomTemplates !== null && !forceRefresh) {
    return cachedCustomTemplates;
  }
  cachedCustomTemplates = await fetchCustomTemplates();
  return cachedCustomTemplates;
}

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
      <button class="dupBtn" data-id="${f.id}" title="Duplicate">⧉</button>
      <button class="delBtn" data-id="${f.id}">✕</button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("delBtn") || e.target.classList.contains("dupBtn")) return;
      selectFlashing(f.id);
    });
    item.querySelector(".delBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFlashing(f.id);
    });
    item.querySelector(".dupBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      duplicateFlashing(f.id);
    });
    list.appendChild(item);
  });
}
async function duplicateFlashing(id) {
  const project = getActiveProject();
  if (!project) return;
  const original = project.flashings.find(f => f.id === id);
  if (!original) return;

  const copy = structuredClone(original);
  copy.name = `${original.name} (copy)`;

  try {
    const row = await createFlashingRow(project.id, copy, project.flashings.length);
    copy.id = row.id;
    project.flashings.push(copy);
    selectFlashing(copy.id);
  } catch (err) {
    alert(`Couldn't duplicate flashing: ${err.message}`);
  }
}

export function selectFlashing(id) {
  state.activeFlashingId = id;
  renderFlashingList();
  syncDetailPanel();
  renderTable();
  fitViewToActive();
  updateHint();
  refreshTaperUI();
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

  document.getElementById("saveAsTemplateBtn").addEventListener("click", async () => {
    const active = getActive();
    if (!active) return;
    if (!active.segments.length) {
      alert("This flashing has no segments to save yet.");
      return;
    }
    const label = prompt("Template name:", active.name);
    if (!label) return;

    try {
      await createTemplateRow(currentUser.id, { ...active, name: label });
      cachedCustomTemplates = null; // force a re-fetch next time the modal opens
      alert("Saved as template.");
    } catch (err) {
      alert(`Couldn't save template: ${err.message}`);
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
  document.getElementById("fromTemplateBtn").addEventListener("click", openTemplateModal);
  document.getElementById("closeTemplateModalBtn").addEventListener("click", () => {
    document.getElementById("templateModal").style.display = "none";
  });
}

async function openTemplateModal() {
  const modal = document.getElementById("templateModal");
  const list = document.getElementById("templateList");
  modal.style.display = "flex";

  // Render built-ins instantly — no network wait for these
  renderTemplateItems(FLASHING_TEMPLATES);

  try {
    const customTemplates = await getCustomTemplates();
    renderTemplateItems([...FLASHING_TEMPLATES, ...customTemplates]);
  } catch (err) {
    console.error("Failed to load custom templates:", err);
  }
}

function renderTemplateItems(templates) {
  const list = document.getElementById("templateList");
  list.innerHTML = "";

  templates.forEach(t => {
    const preview = cloneTemplate(t);
    const thumbCanvas = renderFlashingThumbnail(preview, 300, 200);

    const item = document.createElement("div");
    item.className = "template-item";
    item.innerHTML = `
      <img src="${thumbCanvas.toDataURL("image/png")}" alt="${t.label}">
      <div class="name">${t.label}${t.custom ? " (yours)" : ""}</div>
      ${t.custom ? `<button class="template-delBtn" title="Delete template">del</button>` : ""}
    `;

    item.addEventListener("click", async () => {
      document.getElementById("templateModal").style.display = "none";
      await addFlashingFromTemplate(t);
    });

    if (t.custom) {
      const delBtn = item.querySelector(".template-delBtn");
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation(); // don't trigger the item's own click-to-add handler
        if (!confirm(`Delete template "${t.label}"? This can't be undone.`)) return;
        try {
          await deleteTemplateRow(t.key);
          cachedCustomTemplates = null; // force re-fetch next open
          const refreshed = await getCustomTemplates();
          renderTemplateItems([...FLASHING_TEMPLATES, ...refreshed]);
        } catch (err) {
          alert(`Couldn't delete template: ${err.message}`);
        }
      });
    }

    list.appendChild(item);
  });
}

async function addFlashingFromTemplate(template) {
  const project = getActiveProject();
  if (!project) return;

  const flashing = cloneTemplate(template); // fresh, independent object every time
  try {
    const row = await createFlashingRow(project.id, flashing, project.flashings.length);
    flashing.id = row.id; // swap the temporary local id for the real DB id
    project.flashings.push(flashing);
    selectFlashing(flashing.id);
  } catch (err) {
    alert(`Couldn't add flashing from template: ${err.message}`);
  }
}
