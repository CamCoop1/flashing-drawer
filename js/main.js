import { initAuth } from "./auth.js";
import { initAuthView } from "./authView.js";
import { initProjectsPanel, loadProjectsFromServer } from "./projectsPanel.js";
import { showView } from "./views.js";
import { initSidebarPanel } from "./sidebarPanel.js";
import { initInteractions } from "./interactions.js";
import { initExport } from "./pdfExport.js";

function onAuthStateChanged(user) {
  const userEmailLabel = document.getElementById("userEmailLabel");

  if (user) {
    userEmailLabel.textContent = user.email;
    showView("menu");
    loadProjectsFromServer(); // Stage 2: read from Supabase on sign-in
  } else {
    userEmailLabel.textContent = "";
    showView("auth");
  }
}

function init() {
  initAuthView();
  initProjectsPanel();
  initSidebarPanel();
  initInteractions();
  initExport();

  initAuth(onAuthStateChanged);
}

init();
