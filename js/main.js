import { initProjectsPanel } from "./projectsPanel.js";
import { initSidebarPanel } from "./sidebarPanel.js";
import { initInteractions } from "./interactions.js";
import { initExport } from "./pdfExport.js";
import { showView } from "./views.js";

function init() {
  initProjectsPanel();
  initSidebarPanel();
  initInteractions();
  initExport();
  showView("menu");
}

init();
