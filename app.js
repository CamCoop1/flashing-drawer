const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const PX_PER_MM = 4;
const SNAP_DEG = 45;
const HIT_RADIUS = 20; // screen px

let startPoint = null;       // world coords {x,y}
let segments = [];           // [{length_mm, rel_angle_deg}]  rel_angle_deg in -180..180 (internal "turn" value)
let mode = "draw";           // draw | edit | pan
let scale = 1;
let offsetX = 0, offsetY = 0;

let dragging = false;
let dragPreview = null;      // world coords, used in draw mode
let editingIndex = null;     // vertex index being dragged in edit mode
let panning = false;
let panStart = null;
let panOffsetStart = null;

// ---------- geometry helpers ----------

function cumulativeDirs() {
  const dirs = [];
  let cur = 0;
  segments.forEach((seg, i) => {
    cur = i === 0 ? seg.rel_angle_deg : cur + seg.rel_angle_deg;
    dirs.push(cur);
  });
  return dirs;
}

function points() {
  if (!startPoint) return [];
  const dirs = cumulativeDirs();
  const pts = [startPoint];
  let cur = startPoint;
  segments.forEach((seg, i) => {
    const rad = (dirs[i] * Math.PI) / 180;
    const lenPx = seg.length_mm * PX_PER_MM;
    cur = { x: cur.x + lenPx * Math.cos(rad), y: cur.y + lenPx * Math.sin(rad) };
    pts.push(cur);
  });
  return pts;
}

function snapRel(deg) {
  let d = ((deg % 360) + 360) % 360;
  let snapped = Math.round(d / SNAP_DEG) * SNAP_DEG % 360;
  if (snapped > 180) snapped -= 360;
  return snapped;
}

// ---------- interior-angle <-> turn conversion ----------
// "turn" = exterior deviation from the previous segment's direction (internal, drives geometry)
// "interior" = the included angle of the bend, as you'd naturally call it (180 = straight, 0 = folded flat back)

function turnToInterior(turnDeg) {
  return Math.round((180 - Math.abs(turnDeg)) * 10) / 10;
}

function interiorToTurn(interiorDeg, currentTurnDeg) {
  const sign = Math.sign(currentTurnDeg) || 1;
  const magnitude = 180 - interiorDeg;
  return magnitude === 0 ? 0 : sign * magnitude;
}

function displayAngleFor(i) {
  // segment 0 has no "previous" to bend from — always shown/locked at 0
  if (i === 0) return 0;
  return turnToInterior(segments[i].rel_angle_deg);
}

// ---------- coordinate transforms ----------

function worldToScreen(p) {
  return { x: p.x * scale + offsetX, y: p.y * scale + offsetY };
}

function screenToWorld(p) {
  return { x: (p.x - offsetX) / scale, y: (p.y - offsetY) / scale };
}

function getRawCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

// ---------- drawing ----------

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  ctx.strokeStyle = "#eee";
  ctx.lineWidth = 1 / scale;
  const gridStep = 20 * PX_PER_MM;
  const worldTL = screenToWorld({ x: 0, y: 0 });
  const worldBR = screenToWorld({ x: canvas.width, y: canvas.height });
  for (let x = Math.floor(worldTL.x / gridStep) * gridStep; x < worldBR.x; x += gridStep) {
    ctx.beginPath(); ctx.moveTo(x, worldTL.y); ctx.lineTo(x, worldBR.y); ctx.stroke();
  }
  for (let y = Math.floor(worldTL.y / gridStep) * gridStep; y < worldBR.y; y += gridStep) {
    ctx.beginPath(); ctx.moveTo(worldTL.x, y); ctx.lineTo(worldBR.x, y); ctx.stroke();
  }

  const pts = points();
  if (pts.length) {
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3 / scale;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (dragging && mode === "draw" && dragPreview) ctx.lineTo(dragPreview.x, dragPreview.y);
    ctx.stroke();

    ctx.fillStyle = "#111";
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2);
      ctx.fill();
    });

    if (dragging && mode === "draw" && dragPreview) {
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(dragPreview.x, dragPreview.y, 5 / scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  if (pts.length > 1) {
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < segments.length; i++) {
      const a = worldToScreen(pts[i]);
      const b = worldToScreen(pts[i + 1]);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const offset = 14;
      const labelX = midX + nx * offset;
      const labelY = midY + ny * offset;

      const text = `${segments[i].length_mm} mm`;
      const textWidth = ctx.measureText(text).width;

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(labelX - textWidth / 2 - 4, labelY - 9, textWidth + 8, 18);

      ctx.fillStyle = "#111";
      ctx.fillText(text, labelX, labelY);
    }
  }

  if (dragging && mode === "draw" && dragPreview && pts.length) {
    const last = pts[pts.length - 1];
    const a = worldToScreen(last);
    const b = worldToScreen(dragPreview);
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dist = Math.hypot(dragPreview.x - last.x, dragPreview.y - last.y);
    const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

    const text = `${lengthMM} mm`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = "rgba(59,130,246,0.9)";
    ctx.fillRect(midX - textWidth / 2 - 4, midY - 9, textWidth + 8, 18);
    ctx.fillStyle = "#fff";
    ctx.fillText(text, midX, midY);
  }
}

// ---------- pointer handling ----------

function nearestVertex(rawPos) {
  const pts = points();
  for (let i = 0; i < pts.length; i++) {
    const screenPt = worldToScreen(pts[i]);
    if (Math.hypot(rawPos.x - screenPt.x, rawPos.y - screenPt.y) < HIT_RADIUS) return i;
  }
  return null;
}

function onDown(e) {
  const rawPos = getRawCanvasPos(e);

  if (mode === "pan") {
    panning = true;
    panStart = rawPos;
    panOffsetStart = { x: offsetX, y: offsetY };
    return;
  }

  if (mode === "edit") {
    const idx = nearestVertex(rawPos);
    if (idx !== null) editingIndex = idx;
    return;
  }

  if (!startPoint) {
    startPoint = screenToWorld(rawPos);
    draw();
    updateHint();
    return;
  }
  const pts = points();
  const last = pts[pts.length - 1];
  const lastScreen = worldToScreen(last);
  if (Math.hypot(rawPos.x - lastScreen.x, rawPos.y - lastScreen.y) > HIT_RADIUS) return;

  dragging = true;
  dragPreview = { ...last };
}

function onMove(e) {
  const rawPos = getRawCanvasPos(e);

  if (mode === "pan" && panning) {
    offsetX = panOffsetStart.x + (rawPos.x - panStart.x);
    offsetY = panOffsetStart.y + (rawPos.y - panStart.y);
    draw();
    return;
  }

  if (mode === "edit" && editingIndex !== null) {
    const worldPos = screenToWorld(rawPos);
    const pts = points();
    const anchor = pts[editingIndex - 1];

    if (!anchor) {
      startPoint = worldPos;
      draw();
      renderTable();
      return;
    }

    const dirs = cumulativeDirs();
    const prevDirRef = editingIndex - 2 >= 0 ? dirs[editingIndex - 2] : 0;
    const rawAngle = (Math.atan2(worldPos.y - anchor.y, worldPos.x - anchor.x) * 180) / Math.PI;
    const relAngle = snapRel(rawAngle - prevDirRef);
    const dist = Math.hypot(worldPos.x - anchor.x, worldPos.y - anchor.y);
    const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

    segments[editingIndex - 1] = { length_mm: Math.max(lengthMM, 0.1), rel_angle_deg: relAngle };
    draw();
    renderTable();
    return;
  }

  if (mode === "draw" && dragging) {
    const worldPos = screenToWorld(rawPos);
    const pts = points();
    const last = pts[pts.length - 1];
    const dirs = cumulativeDirs();
    const prevDir = dirs.length ? dirs[dirs.length - 1] : 0;

    const rawAngle = (Math.atan2(worldPos.y - last.y, worldPos.x - last.x) * 180) / Math.PI;
    const relAngle = snapRel(rawAngle - prevDir);
    const dist = Math.hypot(worldPos.x - last.x, worldPos.y - last.y);
    const snappedAbs = prevDir + relAngle;
    const rad = (snappedAbs * Math.PI) / 180;

    dragPreview = { x: last.x + dist * Math.cos(rad), y: last.y + dist * Math.sin(rad) };
    draw();
  }
}

function onUp() {
  if (mode === "pan") { panning = false; return; }
  if (mode === "edit") { editingIndex = null; return; }

  if (mode === "draw" && dragging) {
    const pts = points();
    const last = pts[pts.length - 1];
    const dist = Math.hypot(dragPreview.x - last.x, dragPreview.y - last.y);
    const lengthMM = Math.round((dist / PX_PER_MM) * 10) / 10;

    if (lengthMM >= 1) {
      const dirs = cumulativeDirs();
      const prevDir = dirs.length ? dirs[dirs.length - 1] : 0;
      const rawAngle = (Math.atan2(dragPreview.y - last.y, dragPreview.x - last.x) * 180) / Math.PI;
      const relAngle = snapRel(rawAngle - prevDir);
      segments.push({ length_mm: lengthMM, rel_angle_deg: relAngle });
      renderTable();
    }
    dragging = false;
    dragPreview = null;
    draw();
    updateHint();
  }
}

canvas.addEventListener("mousedown", onDown);
canvas.addEventListener("mousemove", onMove);
canvas.addEventListener("mouseup", onUp);
canvas.addEventListener("mouseleave", onUp);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); onDown(e); });
canvas.addEventListener("touchmove", (e) => { e.preventDefault(); onMove(e); });
canvas.addEventListener("touchend", (e) => { e.preventDefault(); onUp(e); });

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rawPos = getRawCanvasPos(e);
  const worldBefore = screenToWorld(rawPos);
  const factor = e.deltaY < 0 ? 1.1 : 0.9;
  scale = Math.min(Math.max(scale * factor, 0.2), 5);
  offsetX = rawPos.x - worldBefore.x * scale;
  offsetY = rawPos.y - worldBefore.y * scale;
  draw();
});

// ---------- mode buttons ----------

function setMode(m) {
  mode = m;
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("mode" + m[0].toUpperCase() + m.slice(1)).classList.add("active");
  updateHint();
}

document.getElementById("modeDraw").addEventListener("click", () => setMode("draw"));
document.getElementById("modeEdit").addEventListener("click", () => setMode("edit"));
document.getElementById("modePan").addEventListener("click", () => setMode("pan"));

document.getElementById("zoomInBtn").addEventListener("click", () => {
  scale = Math.min(scale * 1.2, 5);
  draw();
});
document.getElementById("zoomOutBtn").addEventListener("click", () => {
  scale = Math.max(scale * 0.8, 0.2);
  draw();
});
document.getElementById("zoomResetBtn").addEventListener("click", () => {
  scale = 1; offsetX = 0; offsetY = 0;
  draw();
});

// ---------- hint ----------

function updateHint() {
  const hint = document.getElementById("hint");
  if (mode === "pan") {
    hint.textContent = "Drag anywhere to pan the view.";
  } else if (mode === "edit") {
    hint.textContent = "Drag any existing point to reshape the profile. Snaps to 45° turns.";
  } else if (!startPoint) {
    hint.textContent = "Click anywhere on the canvas to place your starting point.";
  } else {
    hint.textContent = "Drag from the blue end-point to draw the next segment. Snaps to 45° turns.";
  }
}

// ---------- sidebar table ----------

function renderTable() {
  const body = document.getElementById("segBody");
  const empty = document.getElementById("segEmpty");
  body.innerHTML = "";
  empty.style.display = segments.length ? "none" : "block";

  segments.forEach((seg, i) => {
    const isFirst = i === 0;
    const angleValue = displayAngleFor(i);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td><input type="number" step="0.1" value="${seg.length_mm}" data-idx="${i}" class="lenInput"></td>
      <td>
        <input type="number" min="0" max="180" step="1" value="${angleValue}"
          data-idx="${i}" class="angleInput" ${isFirst ? "disabled title=\"Start direction — not a bend\"" : ""}>
      </td>
      <td><button data-idx="${i}" class="delBtn">✕</button></td>
    `;
    body.appendChild(tr);
  });

  document.querySelectorAll(".lenInput").forEach(input => {
    input.addEventListener("input", (e) => {
      segments[e.target.dataset.idx].length_mm = parseFloat(e.target.value) || 0;
      draw();
      updateTotal();
    });
  });

  document.querySelectorAll(".angleInput").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      if (idx === 0) return; // locked
      let interior = parseFloat(e.target.value);
      if (isNaN(interior)) return;
      interior = Math.min(Math.max(interior, 0), 180);

      segments[idx].rel_angle_deg = interiorToTurn(interior, segments[idx].rel_angle_deg);
      draw();
    });

    input.addEventListener("blur", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      e.target.value = displayAngleFor(idx);
    });
  });

  document.querySelectorAll(".delBtn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      segments.splice(e.target.dataset.idx, 1);
      renderTable();
      draw();
      updateTotal();
    });
  });

  updateTotal();
}

function updateTotal() {
  const total = segments.reduce((sum, s) => sum + s.length_mm, 0);
  document.getElementById("totalGirth").textContent = Math.round(total * 10) / 10;
}

// ---------- toolbar actions ----------

document.getElementById("newBtn").addEventListener("click", () => {
  startPoint = null;
  segments = [];
  scale = 1; offsetX = 0; offsetY = 0;
  renderTable();
  draw();
  updateHint();
});

document.getElementById("undoBtn").addEventListener("click", () => {
  segments.pop();
  renderTable();
  draw();
});

document.getElementById("exportPngBtn").addEventListener("click", () => {
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = "flashing-profile.png";
  a.click();
});

document.getElementById("exportPdfBtn").addEventListener("click", () => {
  if (!segments.length) {
    alert("Draw a profile first.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFontSize(16);
  doc.text("Flashing Profile", 15, 15);

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 180;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;
  doc.addImage(imgData, "PNG", 15, 22, imgWidth, imgHeight);

  let y = 22 + imgHeight + 10;
  doc.setFontSize(12);
  doc.text("Segment breakdown (interior angle of bend):", 15, y);
  y += 7;

  segments.forEach((seg, i) => {
    doc.setFontSize(10);
    const angle = displayAngleFor(i);
    const label = i === 0 ? "start (no bend)" : `${angle}°`;
    doc.text(`${i + 1}. ${seg.length_mm} mm, ${label}`, 15, y);
    y += 6;
  });

  y += 4;
  const total = segments.reduce((sum, s) => sum + s.length_mm, 0);
  doc.setFontSize(12);
  doc.text(`Total girth: ${Math.round(total * 10) / 10} mm`, 15, y);

  doc.save("flashing-profile.pdf");
});

renderTable();
draw();