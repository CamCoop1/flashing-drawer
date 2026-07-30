// Static library of predefined flashing shapes. These are plain data —
// never mutated directly. Adding one to a project always goes through
// cloneTemplate(), which deep-copies everything so edits to the resulting
// flashing can never leak back into this array or into any other flashing
// cloned from the same template.

export const FLASHING_TEMPLATES = [
  {
    key: "apron",
    label: "Apron Flashing",
    colourName: "",
    colouredSide: 1,
    segments: [
      { length_mm: 150, rel_angle_deg: 0 },   // first segment: angle is always 0 (no bend)
      { length_mm: 100, rel_angle_deg: 90 },
      { length_mm: 20, rel_angle_deg: 315 },
    ],
  },
    {
        key: "barge-cap",
        label: "Barge Cap",
        colourName: "",
        colouredSide: -1,
        segments: [
            { length_mm: 20, rel_angle_deg: 0 },
            { length_mm: 150, rel_angle_deg: 45 },
            { length_mm: 50, rel_angle_deg: 90 },
            { length_mm: 20, rel_angle_deg: 90 },
            { length_mm: 10, rel_angle_deg: 90 },
    ],
  },
];

// Produces a brand-new, fully independent flashing object from a template.
// No property of the result shares a reference with the template or with
// any other clone made from it.
export function cloneTemplate(template) {
  const cloned = structuredClone(template);
  return {
    id: crypto.randomUUID(),          // temporary local id — replaced by the real DB id after insert
    name: template.label,
    colourName: cloned.colourName,
    colourHex: "#3b82f6",
    colouredSide: cloned.colouredSide,
    run_lengths_raw: "",
    startPoint: { x: 300, y: 300 },   // fixed canonical starting point; user can drag it after adding
    segments: cloned.segments,
  };
}
