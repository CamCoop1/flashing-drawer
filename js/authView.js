import { signUp, signIn, signOut } from "./auth.js";
import { showView } from "./views.js";

function setError(elId, msg) {
  document.getElementById(elId).textContent = msg || "";
}

function setStatus(msg) {
  document.getElementById("authStatus").textContent = msg || "";
}

function switchToSignUp() {
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("signUpForm").style.display = "flex";
  setError("signInError", "");
  setError("signUpError", "");
  setStatus("");
}

function switchToSignIn() {
  document.getElementById("signUpForm").style.display = "none";
  document.getElementById("signInForm").style.display = "flex";
  setError("signInError", "");
  setError("signUpError", "");
  setStatus("");
}

export function onAuthStateChanged(user) {
  const userEmailLabel = document.getElementById("userEmailLabel");
  if (user) {
    userEmailLabel.textContent = user.email;
    showView("menu");
  } else {
    userEmailLabel.textContent = "";
    switchToSignIn();
    showView("auth");
  }
}

export function initAuthView() {
  // --- Sign In ---
  document.getElementById("signInForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("signInError", "");
    setStatus("Signing in...");
    try {
      await signIn(
        document.getElementById("siEmail").value.trim(),
        document.getElementById("siPassword").value
      );
      setStatus("");
    } catch (err) {
      setStatus("");
      setError("signInError", err.message || "Sign in failed.");
    }
  });

  // --- Create Account ---
  document.getElementById("signUpForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    setError("signUpError", "");

    const email = document.getElementById("suEmail").value.trim();
    const password = document.getElementById("suPassword").value;
    const confirm = document.getElementById("suPasswordConfirm").value;

    if (password !== confirm) {
      setError("signUpError", "Passwords don't match.");
      return;
    }

    setStatus("Creating account...");
    try {
      await signUp(email, password);
      setStatus("Account created — check your email to confirm, then sign in.");
      switchToSignIn();
      document.getElementById("siEmail").value = email;
    } catch (err) {
      setStatus("");
      setError("signUpError", err.message || "Sign up failed.");
    }
  });

  // --- Form switching ---
  document.getElementById("showSignUpBtn").addEventListener("click", switchToSignUp);
  document.getElementById("showSignInBtn").addEventListener("click", switchToSignIn);

  // --- Password show/hide toggles ---
  document.querySelectorAll(".pw-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      const isHidden = target.type === "password";
      target.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "Hide" : "Show";
    });
  });

  // --- Sign out (lives on the menu screen, wired here since it's auth-related) ---
  document.getElementById("signOutBtn").addEventListener("click", async () => {
    await signOut();
  });
}
