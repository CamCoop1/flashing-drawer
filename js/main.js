import { state, makeFlashing } from "./state.js";
import { draw } from "./renderer.js";
import { renderTable } from "./segmentTable.js";
import { renderFlashingList, syncDetailPanel, initSidebarPanel } from "./sidebarPanel.js";
import { initInteractions, updateHint } from "./interactions.js";
import { initExport } from "./pdfExport.js";

function init() {
  initSidebarPanel();
  initInteractions();
  initExport();

  const first = makeFlashing();
  state.flashings.push(first);
  state.activeId = first.id;

  renderFlashingList();
  syncDetailPanel();
  renderTable();
  draw();
  updateHint();
}

init();
