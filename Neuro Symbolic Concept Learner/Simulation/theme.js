/* Apply the saved or system theme before the stylesheet paints the page. */
(function () {
  "use strict";

  const key = "nscl-theme";
  const root = document.documentElement;
  const system = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
  let saved = null;
  try { saved = localStorage.getItem(key); } catch (_) { /* file:// storage may be unavailable */ }
  let manuallyChosen = saved === "dark" || saved === "light";

  function apply(theme) {
    const dark = theme === "dark";
    root.dataset.theme = dark ? "dark" : "light";
    const toggle = document.getElementById("theme-toggle");
    if (toggle) {
      toggle.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
      toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#111a20" : "#f6f2e9");
  }

  apply(manuallyChosen ? saved : system?.matches ? "dark" : "light");

  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    document.getElementById("theme-toggle").addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      manuallyChosen = true;
      apply(next);
      try { localStorage.setItem(key, next); } catch (_) { /* toggle still works this visit */ }
    });
    system?.addEventListener?.("change", event => {
      if (!manuallyChosen) apply(event.matches ? "dark" : "light");
    });
  });
})();
