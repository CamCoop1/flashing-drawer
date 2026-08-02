import { getActive } from "./state.js";
import { debouncedSaveFlashing } from "./db.js";
import { displayAngleFor, interiorToTurn } from "./geometry.js";
import { draw } from "./draw/index.js";
import { renderFlashingList } from "./sidebarPanel.js";

export function renderTable() {
  const active = getActive();
  const body = document.getElementById("segBody");
  const empty = document.getElementById("segEmpty");
  body.innerHTML = "";

  if (!active) {
    empty.style.display = "block";
    empty.textContent = "Select a flashing to edit its segments.";
    updateTotal();
    return;
  }

  empty.textContent = "No segments yet — draw on the canvas to add one.";
  empty.style.display = active.segments.length ? "none" : "block";

  active.segments.forEach((seg, i) => {
    const isFirst = i === 0;
    const angleValue = displayAngleFor(active, i);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><input type="number" step="0.1" value="${seg.length_mm}" data-idx="${i}" class="lenInput"></td>
      <td>
        <input type="number" min="0" max="180" step="1" value="${angleValue}"
          data-idx="${i}" class="angleInput" ${isFirst ? "disabled" : ""}>
      </td>
      <td><button data-idx="${i}" class="segDelBtn">✕</button></td>
    `;
    body.appendChild(tr);
  });

  // Scoped to #segBody only, so this can never accidentally pick up
  // delete buttons belonging to the flashing list sidebar.
  body.querySelectorAll(".lenInput").forEach(input => {
    input.addEventListener("input", (e) => {
      active.segments[e.target.dataset.idx].length_mm = parseFloat(e.target.value) || 0;
      draw();
      updateTotal();
      debouncedSaveFlashing(active);
    });
  });

  body.querySelectorAll(".angleInput").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      if (idx === 0) return;
      let interior = parseFloat(e.target.value);
      if (isNaN(interior)) return;
      interior = Math.min(Math.max(interior, 0), 180);
      active.segments[idx].rel_angle_deg = interiorToTurn(interior, active.segments[idx].rel_angle_deg);
      draw();
      debouncedSaveFlashing(active);
    });
    input.addEventListener("blur", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      e.target.value = displayAngleFor(active, idx);
    });
  });

  body.querySelectorAll(".segDelBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      active.segments.splice(parseInt(e.target.dataset.idx), 1);
      renderTable();
      draw();
      updateTotal();
      renderFlashingList();
      debouncedSaveFlashing(active);
    });
  });

  updateTotal();
}

export function updateTotal() {
  const active = getActive();
  const total = active ? active.segments.reduce((sum, s) => sum + s.length_mm, 0) : 0;
  document.getElementById("totalGirth").textContent = Math.round(total * 10) / 10;
}
