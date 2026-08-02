import { supabase } from "./supabaseClient.js";

export async function fetchProjects() {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, flashings(*)")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return projects.map(p => ({
    id: p.id,
    name: p.name,
    poNumber: p.po_number || "",
    flashings: (p.flashings || [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(f => ({
        id: f.id,
        name: f.name,
        colourName: f.colour_name || "",
        colourHex: f.colour_hex || "#3b82f6",
        colouredSide: f.coloured_side ?? null,
        run_lengths_raw: f.run_lengths_raw || "",
        startPoint: f.start_point || null,
        segments: f.segments || [],
        taperEnabled: f.taper_enabled ?? false,
        taperSide: f.taper_side || "near",
        farStartPoint: f.far_start_point || null,
        farSegments: f.far_segments || [],
        rotationDeg: f.rotation_deg ?? 0,
      })),
  }));
}

export async function createProjectRow(userId, name, poNumber) {
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name, po_number: poNumber })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProjectRow(projectId) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

function flashingToRow(flashing, extra = {}) {
  return {
    name: flashing.name,
    colour_name: flashing.colourName,
    colour_hex: flashing.colourHex,
    coloured_side: flashing.colouredSide,
    run_lengths_raw: flashing.run_lengths_raw,
    start_point: flashing.startPoint,
    segments: flashing.segments,
    taper_enabled: flashing.taperEnabled ?? false,
    taper_side: flashing.taperSide || "near",
    far_start_point: flashing.farStartPoint || null,
    far_segments: flashing.farSegments || [],
    rotation_deg: flashing.rotationDeg ?? 0,
    ...extra,
  };
}

export async function createFlashingRow(projectId, flashing, sortOrder = 0) {
  const { data, error } = await supabase
    .from("flashings")
    .insert(flashingToRow(flashing, { project_id: projectId, sort_order: sortOrder }))
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateFlashingRow(flashing) {
  const { error } = await supabase
    .from("flashings")
    .update({ ...flashingToRow(flashing), updated_at: new Date().toISOString() })
    .eq("id", flashing.id);
  if (error) throw error;
}

export async function deleteFlashingRow(flashingId) {
  const { error } = await supabase.from("flashings").delete().eq("id", flashingId);
  if (error) throw error;
}

// --- save status tracking, so the UI can show Saving / Saved / Failed ---
let statusCallback = null;
export function onSaveStatusChange(fn) {
  statusCallback = fn;
}
function setStatus(status) {
  if (statusCallback) statusCallback(status); // "saving" | "saved" | "error"
}

async function updateFlashingRowTracked(flashing) {
  try {
    await updateFlashingRow(flashing);
    setStatus("saved");
  } catch (err) {
    setStatus("error");
    throw err;
  }
}

const pendingSaves = new Map(); // flashingId -> timeout handle

export function debouncedSaveFlashing(flashing, delay = 600) {
  if (!flashing?.id) return;
  clearTimeout(pendingSaves.get(flashing.id));
  setStatus("saving");
  const handle = setTimeout(() => {
    updateFlashingRowTracked(flashing).catch(err => console.error("Failed to save flashing:", err));
    pendingSaves.delete(flashing.id);
  }, delay);
  pendingSaves.set(flashing.id, handle);
}

export function flushPendingSaves(flashings = []) {
  flashings.forEach(f => {
    if (pendingSaves.has(f.id)) {
      clearTimeout(pendingSaves.get(f.id));
      pendingSaves.delete(f.id);
      updateFlashingRowTracked(f).catch(err => console.error("Flush save failed:", err));
    }
  });
}

// --- templates (custom, per-user) ---
export async function fetchCustomTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(t => ({
    key: t.id,
    label: t.label,
    colourName: t.colour_name || "",
    colouredSide: t.coloured_side,
    segments: t.segments,
    custom: true,
  }));
}

export async function createTemplateRow(userId, flashing) {
  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: userId,
      label: flashing.name,
      colour_name: flashing.colourName,
      coloured_side: flashing.colouredSide,
      segments: flashing.segments,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}


export async function deleteTemplateRow(templateId) {
  const { error } = await supabase.from("templates").delete().eq("id", templateId);
  if (error) throw error;
}
