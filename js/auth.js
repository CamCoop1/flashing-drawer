import { supabase } from "./supabaseClient.js";

export let currentUser = null;

let authChangeCallback = null;

export async function initAuth(onAuthChange) {
  authChangeCallback = onAuthChange;

  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  onAuthChange(currentUser);

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    if (authChangeCallback) authChangeCallback(currentUser);
  });
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  // Supabase returns a user object even for an already-registered email
  // (to avoid leaking account existence via error messages), but that
  // user's identities array will be empty in that case — a real new
  // signup has at least one identity attached.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error("An account with this email already exists. Try signing in instead.");
  }

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
