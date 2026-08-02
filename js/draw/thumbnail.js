import { pointsFor } from "../geometry.js";
import { drawSideArrowsScreenSpace } from "./colouredSideArrows.js";

export function renderFlashingThumbnail(flashing, pxWidth, pxHeight) {
  const off = document.createElement("canvas");
  off.width = pxWidth;
  off.height = pxHeight;
  const octx = off.getContext("2d");

  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, pxWidth, pxHeight);

  const pts = pointsFor(flashing);
  if (!pts.length) {
    octx.fillStyle = "#999";
    octx.font = "14px sans-serif";
    octx.textAlign = "center";
    octx.fillText("No profile drawn", pxWidth / 2, pxHeight / 2);
    return off;
  }

  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = 44;
  const fitScale = Math.min((pxWidth - pad * 2) / w, (pxHeight - pad * 2) / h);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const ox = pxWidth / 2 - cx * fitScale;
  const oy = pxHeight / 2 - cy * fitScale;

  const toLocal = (p) => ({ x: p.x * fitScale + ox, y: p.y * fitScale + oy });
  const localPts = pts.map(toLocal);

  octx.strokeStyle = flashing.colourHex;
  octx.lineWidth = 3;
  octx.beginPath();
  octx.moveTo(localPts[0].x, localPts[0].y);
  for (let i = 1; i < localPts.length; i++) octx.lineTo(localPts[i].x, localPts[i].y);
  octx.stroke();

  octx.fillStyle = "#111";
  localPts.forEach(p => {
    octx.beginPath();
    octx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    octx.fill();
  });

  octx.font = "12px -apple-system, sans-serif";
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  for (let i = 0; i < flashing.segments.length; i++) {
    const a = localPts[i], b = localPts[i + 1];
    const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const labelX = midX + nx * 12, labelY = midY + ny * 12;
    const text = `${flashing.segments[i].length_mm}`;
    const tw = octx.measureText(text).width;
    octx.fillStyle = "rgba(255,255,255,0.9)";
    octx.fillRect(labelX - tw / 2 - 3, labelY - 8, tw + 6, 16);
    octx.fillStyle = "#111";
    octx.fillText(text, labelX, labelY);
  }

  // taper indicator lines, drawn the same way as the live canvas version
  if (flashing.taperEnabled && localPts.length >= 2) {
    const dir = flashing.taperSide === "near"
      ? { x: 0.35, y: -1 }
      : { x: -0.35, y: 1 };
    const mag = Math.hypot(dir.x, dir.y);
    const unit = { x: dir.x / mag, y: dir.y / mag };
    const lineLength = Math.max(pxWidth, pxHeight) * 0.35; // shorter than the live canvas version, scaled for the smaller thumbnail

    octx.save();
    octx.strokeStyle = "rgba(128,128,128,0.75)";
    octx.lineWidth = 2;

    localPts.forEach(p => {
      const endX = p.x + unit.x * lineLength;
      const endY = p.y + unit.y * lineLength;
      octx.beginPath();
      octx.moveTo(p.x, p.y);
      octx.lineTo(endX, endY);
      octx.stroke();
    });

    octx.restore();

    const labelAnchor = localPts[0];
    const labelX = labelAnchor.x + unit.x * (lineLength + 8);
    const labelY = labelAnchor.y + unit.y * (lineLength + 8);
    octx.fillStyle = "rgba(0,0,0,0.7)";
    octx.font = "11px -apple-system, sans-serif";
    octx.textAlign = "center";
    octx.fillText(flashing.taperSide === "near" ? "Near side" : "Far side", labelX, labelY);
  }

  drawSideArrowsScreenSpace(octx, flashing, localPts, 16);

  return off;
}
