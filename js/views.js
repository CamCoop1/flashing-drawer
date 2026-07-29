export function showView(name) {
  document.getElementById("menuView").classList.toggle("active", name === "menu");
  document.getElementById("editorView").classList.toggle("active", name === "editor");
}
