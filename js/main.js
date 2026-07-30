import { initAuth } from "./auth.js";
import { initAuthView } from "./authView.js";
import { initProjectsPanel, loadProjectsFromServer } from "./projectsPanel.js";
import { showView } from "./views.js";
import { initSidebarPanel } from "./sidebarPanel.js";
import { initInteractions } from "./interactions.js";
import { initExport } from "./pdfExport.js";
import { onSaveStatusChange } from "./db.js";

let hasHandledInitialAuth = false;
let wasSignedIn = false;

function onAuthStateChanged(user) {
  const userEmailLabel = document.getElementById("userEmailLabel");

  if (user) {
    userEmailLabel.textContent = user.email;

    // Only force navigation to the menu on a genuine sign-in transition
    // (first load, or coming from signed-out) — not on incidental session
    // re-validation, e.g. when Supabase re-checks the session after the
    // tab regains focus. Otherwise this would kick you out of the editor
    // every time you tab away and back.
    if (!wasSignedIn) {
      showView("menu");
      loadProjectsFromServer();
    }
    wasSignedIn = true;
  } else {
    userEmailLabel.textContent = "";
    showView("auth");
    wasSignedIn = false;
  }

  hasHandledInitialAuth = true;
}

function updateSaveStatusUI(status) {
  const el = document.getElementById("saveStatus");
  el.className = "save-status " + status;
  el.textContent = status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save failed";
}

function init() {
  initAuthView();
  initProjectsPanel();
  initSidebarPanel();
  initInteractions();
  initExport();
  onSaveStatusChange(updateSaveStatusUI);

  initAuth(onAuthStateChanged);
}

init();
