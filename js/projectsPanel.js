import { state, makeProject, makeFlashing } from "./state.js";
import { fetchProjects, createProjectRow, deleteProjectRow, createFlashingRow, flushPendingSaves } from "./db.js";
import { currentUser } from "./auth.js";
import { showView } from "./views.js";
import { renderFlashingList, syncDetailPanel } from "./sidebarPanel.js";
import { renderTable } from "./segmentTable.js";
import { fitViewToActive } from "./renderer.js";
import { updateHint } from "./interactions.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function renderProjectList() {
  const list = document.getElementById("projectList");
  const empty = document.getElementById("projectEmpty");
  list.innerHTML = "";
  empty.style.display = state.projects.length ? "none" : "block";
  empty.textContent = "No projects yet — click \"+ New Project\" to start one.";

  state.projects.forEach(p => {
    const item = document.createElement("div");
    item.className = "project-item";
    item.innerHTML = `
      <div class="info">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="meta">P/O: ${escapeHtml(p.poNumber || "—")} · ${p.flashings.length} flashing(s)</div>
      </div>
      <button class="delBtn" data-id="${p.id}">✕</button>
    `;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("delBtn")) return;
      openProject(p.id);
    });
    item.querySelector(".delBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteProject(p.id);
    });
    list.appendChild(item);
  });
}

export async function loadProjectsFromServer() {
  const empty = document.getElementById("projectEmpty");
  empty.style.display = "block";
  empty.textContent = "Loading projects...";
  try {
    state.projects = await fetchProjects();
    renderProjectList();
  } catch (err) {
    empty.style.display = "block";
    empty.textContent = `Couldn't load projects: ${err.message}`;
    console.error("fetchProjects failed:", err);
  }
}

export function openProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return;

  state.activeProjectId = id;
  state.activeFlashingId = project.flashings.length ? project.flashings[0].id : null;

  document.getElementById("projectTitle").textContent = project.name;
  document.getElementById("projectSubtitle").textContent = project.poNumber ? `P/O: ${project.poNumber}` : "No P/O number set";

  showView("editor");
  renderFlashingList();
  syncDetailPanel();
  renderTable();
  fitViewToActive();
  updateHint();
}

async function deleteProject(id) {
  if (!confirm("Delete this project and all its flashings? This cannot be undone.")) return;
  try {
    await deleteProjectRow(id); // cascades to flashings via the FK's on delete cascade
    state.projects = state.projects.filter(p => p.id !== id);
    renderProjectList();
  } catch (err) {
    alert(`Couldn't delete project: ${err.message}`);
  }
}

export function initProjectsPanel() {
  document.getElementById("newProjectBtn").addEventListener("click", () => {
    document.getElementById("newProjectForm").style.display = "flex";
    document.getElementById("npName").focus();
  });

  document.getElementById("npCancelBtn").addEventListener("click", () => {
    document.getElementById("newProjectForm").style.display = "none";
    document.getElementById("npName").value = "";
    document.getElementById("npPO").value = "";
  });

  document.getElementById("npCreateBtn").addEventListener("click", async () => {
    const name = document.getElementById("npName").value.trim();
    const po = document.getElementById("npPO").value.trim();
    if (!name) {
      alert("Please enter a project name.");
      return;
    }
    const createBtn = document.getElementById("npCreateBtn");
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";

    try {
      const projectRow = await createProjectRow(currentUser.id, name, po);
      const project = { id: projectRow.id, name: projectRow.name, poNumber: projectRow.po_number || "", flashings: [] };

      const firstFlashing = makeFlashing(project);
      const flashingRow = await createFlashingRow(project.id, firstFlashing, 0);
      project.flashings.push({ ...firstFlashing, id: flashingRow.id });

      state.projects.push(project);

      document.getElementById("npName").value = "";
      document.getElementById("npPO").value = "";
      document.getElementById("newProjectForm").style.display = "none";

      renderProjectList();
      openProject(project.id);
    } catch (err) {
      alert(`Couldn't create project: ${err.message}`);
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = "Create";
    }
  });

  document.getElementById("backToMenuBtn").addEventListener("click", () => {
    const project = state.projects.find(p => p.id === state.activeProjectId);
    if (project) flushPendingSaves(project.flashings);
    showView("menu");
    renderProjectList();
  });

  document.getElementById("exportProjectsBtn").addEventListener("click", () => {
    if (!state.projects.length) {
      alert("No projects to export yet.");
      return;
    }
    const dataStr = JSON.stringify(state.projects, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashing-projects-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
