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

export async function updateFlashingRow(flashing) {
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

// --- debounced autosave, so drags/typing don't fire a network call per pixel/keystroke ---
const pendingSaves = new Map(); // flashingId -> timeout handle

export function debouncedSaveFlashing(flashing, delay = 600) {
  if (!flashing?.id) return;
  clearTimeout(pendingSaves.get(flashing.id));
  const handle = setTimeout(() => {
    updateFlashingRow(flashing).catch(err => {
      console.error("Failed to save flashing:", err);
    });
    pendingSaves.delete(flashing.id);
  }, delay);
  pendingSaves.set(flashing.id, handle);
}

// Flushes any pending debounced save immediately — useful right before
// navigating away (e.g. back to menu) so nothing gets lost.
export function flushPendingSaves(flashings = []) {
  flashings.forEach(f => {
    if (pendingSaves.has(f.id)) {
      clearTimeout(pendingSaves.get(f.id));
      pendingSaves.delete(f.id);
      updateFlashingRow(f).catch(err => console.error("Flush save failed:", err));
    }
  });
}
