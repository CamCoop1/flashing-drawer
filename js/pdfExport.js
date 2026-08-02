import { getActiveProject, parseRunLengths } from "./state.js";
import { canvas } from "./canvas.js";
import { renderFlashingThumbnail } from "./draw/index.js";
import { displayAngleFor } from "./geometry.js";

// ---------- layout constants ----------
const PAGE_MARGIN = 12;
const CARD_PADDING = 6;
const CARD_RADIUS = 2.5;
const IMAGE_HEIGHT = 48;
const ROW_HEIGHT = 4.6;
const SECTION_GAP = 4;
const CARD_GAP = 6;

const ACCENT_GREY = [90, 90, 90];
const LABEL_GREY = [140, 140, 140];
const TEXT_DARK = [30, 30, 30];
const BORDER_GREY = [225, 225, 225];
const HEADER_BG = [248, 248, 248];
const TAPER_HIGHLIGHT = [255, 224, 189]; // pastel orange

function hexToRgb(hex) {
  const clean = (hex || "#3b82f6").replace("#", "");
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function shortSegLabel(seg, i, flashing, segments) {
  const angle = displayAngleFor({ segments }, i);
  const angleLabel = i === 0 ? "start" : `${angle}°`;
  return `${i + 1}) ${seg.length_mm}mm / ${angleLabel}`;
}

// ---------- content height calculation (shared by measure + draw pass) ----------
function computeSegmentRowCount(flashing) {
  if (flashing.taperEnabled) {
    return Math.max(flashing.segments.length, flashing.farSegments?.length || 0, 1);
  }
  return Math.max(flashing.segments.length, 1);
}

function computeCardHeight(flashing) {
  const rowCount = computeSegmentRowCount(flashing);
  const segHeaderHeight = flashing.taperEnabled ? 4.5 : 4;
  // non-tapered is single column now, so it needs one row per segment,
  // not half as many like the two-column layout did
  const segSectionHeight = segHeaderHeight + rowCount * ROW_HEIGHT;

  const topBlock = 8;                 // name/colour header row
  const imageBlock = IMAGE_HEIGHT + SECTION_GAP;
  const metaBlock = 4 + 4;            // girth + required-lengths line
  const segBlock = segSectionHeight + 2;

  return CARD_PADDING * 2 + topBlock + imageBlock + metaBlock + segBlock;
}

// ---------- drawing a single card ----------
function drawCard(doc, flashing, x, y, width) {
  const height = computeCardHeight(flashing);
  const accent = hexToRgb(flashing.colourHex);

  // card background + border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...BORDER_GREY);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, CARD_RADIUS, CARD_RADIUS, "FD");

  // accent bar down the left edge
  doc.setFillColor(...accent);
  doc.roundedRect(x, y, 2.5, height, CARD_RADIUS, CARD_RADIUS, "F");
  doc.setFillColor(255, 255, 255);
  doc.rect(x + 2.5, y, width - 2.5, height, "F"); // square off the bar's right side against the card
  doc.setDrawColor(...BORDER_GREY);
  doc.roundedRect(x, y, width, height, CARD_RADIUS, CARD_RADIUS, "D"); // redraw border on top

  const contentX = x + CARD_PADDING + 2;
  const contentWidth = width - CARD_PADDING * 2 - 2;
  let cursorY = y + CARD_PADDING + 3;

  // --- header row: name + colour ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT_DARK);
  doc.text(flashing.name || "Untitled", contentX, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...LABEL_GREY);
  const colourLabel = flashing.colourName ? flashing.colourName : "No colour set";
  doc.text(colourLabel, x + width - CARD_PADDING, cursorY, { align: "right" });

  cursorY += 5;

  // --- profile image ---
  const thumb = renderFlashingThumbnail(flashing, 700, 260);
  const imgData = thumb.toDataURL("image/png");
  doc.addImage(imgData, "PNG", contentX, cursorY, contentWidth, IMAGE_HEIGHT);
  cursorY += IMAGE_HEIGHT + SECTION_GAP;

  // --- meta row: girth + required lengths ---
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...ACCENT_GREY);
  const girth = flashing.segments.reduce((sum, s) => sum + s.length_mm, 0);
  doc.text(`GIRTH  ${Math.round(girth * 10) / 10}mm`, contentX, cursorY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LABEL_GREY);
  const parsedLengths = parseRunLengths(flashing.run_lengths_raw);
  const reqLengthsStr = parsedLengths.length
    ? parsedLengths.map(p => `${p.qty} × ${p.length}`).join("   ")
    : "—";
  doc.text(`Required: ${reqLengthsStr}`, contentX + 32, cursorY);

  cursorY += 7;

  // --- segment breakdown ---
  doc.setDrawColor(...BORDER_GREY);
  doc.setLineWidth(0.2);
  doc.line(contentX, cursorY - 3, x + width - CARD_PADDING, cursorY - 3);

  if (flashing.taperEnabled) {
    drawTaperedColumns(doc, flashing, contentX, cursorY, contentWidth);
  } else {
    drawSingleColumn(doc, flashing, contentX, cursorY, contentWidth);
  }

  return height;
}

function drawSingleColumn(doc, flashing, x, y, width) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...LABEL_GREY);
  doc.text("SEGMENTS", x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_DARK);

  if (!flashing.segments.length) {
    doc.setTextColor(...LABEL_GREY);
    doc.text("—", x, y + ROW_HEIGHT);
    return;
  }

  flashing.segments.forEach((seg, i) => {
    const label = shortSegLabel(seg, i, flashing, flashing.segments);
    doc.text(label, x, y + ROW_HEIGHT + i * ROW_HEIGHT);
  });
}

function drawTaperedColumns(doc, flashing, x, y, width) {
  const nearSegs = flashing.segments || [];
  const farSegs = flashing.farSegments || [];
  const rowCount = Math.max(nearSegs.length, farSegs.length);
  const colGap = 6;
  const colWidth = (width - colGap) / 2;
  const farX = x + colWidth + colGap;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT_GREY);
  doc.text("NEAR", x, y);
  doc.text("FAR", farX, y);

  if (!rowCount) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...LABEL_GREY);
    doc.text("—", x, y + ROW_HEIGHT);
    doc.text("—", farX, y + ROW_HEIGHT);
    return;
  }

  for (let i = 0; i < rowCount; i++) {
    const nearSeg = nearSegs[i];
    const farSeg = farSegs[i];
    const rowY = y + ROW_HEIGHT + i * ROW_HEIGHT;

    const differs = nearSeg && farSeg && nearSeg.length_mm !== farSeg.length_mm;

    if (differs) {
      doc.setFillColor(...TAPER_HIGHLIGHT);
      doc.rect(x - 1, rowY - 3.6, colWidth - 2, 4.6, "F");
      doc.rect(farX - 1, rowY - 3.6, colWidth - 2, 4.6, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    if (nearSeg) {
      doc.setTextColor(...TEXT_DARK);
      doc.text(shortSegLabel(nearSeg, i, flashing, nearSegs), x, rowY);
    } else {
      doc.setTextColor(...LABEL_GREY);
      doc.text("—", x, rowY);
    }

    if (farSeg) {
      doc.setTextColor(...TEXT_DARK);
      doc.text(shortSegLabel(farSeg, i, flashing, farSegs), farX, rowY);
    } else {
      doc.setTextColor(...LABEL_GREY);
      doc.text("—", farX, rowY);
    }
  }
}

// ---------- main export ----------
export function initExport() {
  document.getElementById("exportPngBtn").addEventListener("click", () => {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashing.png";
    a.click();
  });

  document.getElementById("exportAllPdfBtn").addEventListener("click", () => {
    const project = getActiveProject();
    if (!project || !project.flashings.length) {
      alert("Add at least one flashing first.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const cardWidth = pageWidth - PAGE_MARGIN * 2;

    let y = PAGE_MARGIN;

    // --- title block ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...TEXT_DARK);
    doc.text(project.name || "Flashing Schedule", PAGE_MARGIN, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...LABEL_GREY);
    doc.text(`P/O Number: ${project.poNumber || "—"}`, PAGE_MARGIN, y);
    y += 3;
    doc.setDrawColor(...BORDER_GREY);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, y + 3, pageWidth - PAGE_MARGIN, y + 3);
    y += 10;

    project.flashings.forEach((f) => {
      const cardHeight = computeCardHeight(f);

      if (y + cardHeight > pageHeight - PAGE_MARGIN) {
        doc.addPage();
        y = PAGE_MARGIN;
      }

      drawCard(doc, f, PAGE_MARGIN, y, cardWidth);
      y += cardHeight + CARD_GAP;
    });

    const filename = (project.name || "flashing-schedule").replace(/\s+/g, "_");
    doc.save(`${filename}.pdf`);
  });
}
