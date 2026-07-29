import { getActiveProject, parseRunLengths } from "./state.js";
import { canvas } from "./canvas.js";
import { renderFlashingThumbnail } from "./renderer.js";
import { displayAngleFor } from "./geometry.js";

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
    const margin = 12;
    const boxWidth = pageWidth - margin * 2;
    const boxImageHeight = 65;

    let y = margin;
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.setFont(undefined, "bold").text("Cams Flashing Tool", margin, y)
    y += 8;
    doc.setFont(undefined, "normal").text(project.name || "Flashing Schedule", margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`P/O Number: ${project.poNumber || "—"}`, margin, y);
    y += 8;

    project.flashings.forEach((f) => {
      const segLines = Math.max(f.segments.length, 1);
      const footerHeight = 6 + segLines * 5 + 6;
      const boxHeight = 12 + boxImageHeight + footerHeight;

      if (y + boxHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setDrawColor(180);
      doc.setLineWidth(0.4);
      doc.rect(margin, y, boxWidth, boxHeight);

      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(f.name || "Untitled", margin + 6, y + 9);

      doc.setFontSize(9);
      doc.setTextColor(100);
      const colourLabel = f.colourName ? `Colour: ${f.colourName}` : "Colour: —";
      doc.text(colourLabel, boxWidth + margin - 4, y + 9, { align: "right" });

      const thumb = renderFlashingThumbnail(f, 700, 260);
      const imgData = thumb.toDataURL("image/png");
      const imgW = boxWidth - 20;
      const imgH = boxImageHeight - 4;
      doc.addImage(imgData, "PNG", margin + 10, y + 13, imgW, imgH);

      const footerY = y + 13 + imgH + 6;
      const colGap = 8;
      const leftColX = margin + 6;
      const rightColX = margin + boxWidth / 2 + colGap;
      const leftColMaxWidth = boxWidth / 2 - colGap - 6;

      doc.setFontSize(9);
      doc.setTextColor(60);

      const girth = f.segments.reduce((sum, s) => sum + s.length_mm, 0);
      doc.text(`Total girth: ${Math.round(girth * 10) / 10} mm`, leftColX, footerY);

      const parsedLengths = parseRunLengths(f.run_lengths_raw);
      const reqLengthsStr = parsedLengths.length
        ? parsedLengths.map(p => `${p.qty} / ${p.length} m`).join(", ")
        : "—";
      doc.text("Required lengths:", leftColX, footerY + 7);
      doc.text(doc.splitTextToSize(reqLengthsStr, leftColMaxWidth), leftColX, footerY + 12);

      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text("Segments (length @ angle):", rightColX, footerY);

      if (f.segments.length) {
        f.segments.forEach((seg, i) => {
          const angle = displayAngleFor(f, i);
          const angleLabel = i === 0 ? "start" : `${angle}°`;
          doc.text(`${i + 1}. ${seg.length_mm} mm @ ${angleLabel}`, rightColX, footerY + 5 + i * 5);
        });
      } else {
        doc.setTextColor(150);
        doc.text("—", rightColX, footerY + 5);
      }

      y += boxHeight + 8;
    });

    const filename = (project.name || "flashing-schedule").replace(/\s+/g, "_");
    doc.save(`${filename}.pdf`);
  });
}
