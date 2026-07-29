import { state, makeProject, makeFlashing, saveProjects, loadProjects } from "./state.js";
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

function deleteProject(id) {
  if (!confirm("Delete this project and all its flashings? This cannot be undone.")) return;
  state.projects = state.projects.filter(p => p.id !== id);
  saveProjects();
  renderProjectList();
}

export function initProjectsPanel() {
  loadProjects();
  renderProjectList();

  document.getElementById("newProjectBtn").addEventListener("click", () => {
    document.getElementById("newProjectForm").style.display = "flex";
    document.getElementById("npName").focus();
  });

  document.getElementById("npCancelBtn").addEventListener("click", () => {
    document.getElementById("newProjectForm").style.display = "none";
    document.getElementById("npName").value = "";
    document.getElementById("npPO").value = "";
  });

  document.getElementById("npCreateBtn").addEventListener("click", () => {
    const name = document.getElementById("npName").value.trim();
    const po = document.getElementById("npPO").value.trim();
    if (!name) {
      alert("Please enter a project name.");
      return;
    }
    const project = makeProject(name, po);
    // give every new project a first flashing so the editor isn't empty
    const firstFlashing = makeFlashing(project);
    project.flashings.push(firstFlashing);

    state.projects.push(project);
    saveProjects();

    document.getElementById("npName").value = "";
    document.getElementById("npPO").value = "";
    document.getElementById("newProjectForm").style.display = "none";

    renderProjectList();
    openProject(project.id);
  });

  document.getElementById("backToMenuBtn").addEventListener("click", () => {
    saveProjects();
    showView("menu");
    renderProjectList();
  });
}
