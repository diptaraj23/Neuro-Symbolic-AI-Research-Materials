/* Theme behavior check without a browser or external package. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadTheme({ saved = null, systemDark = false } = {}) {
  const values = new Map(saved ? [["nscl-theme", saved]] : []);
  const events = {};
  const toggle = {
    textContent: "",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(type, handler) { events[`button:${type}`] = handler; }
  };
  const meta = { setAttribute(name, value) { this[name] = value; } };
  const document = {
    documentElement: { dataset: {} },
    getElementById() { return toggle; },
    querySelector() { return meta; },
    addEventListener(type, handler) { events[`document:${type}`] = handler; }
  };
  const system = {
    matches: systemDark,
    addEventListener(type, handler) { events[`system:${type}`] = handler; }
  };
  const localStorage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); }
  };
  vm.runInNewContext(fs.readFileSync("theme.js", "utf8"), { document, localStorage, matchMedia: () => system });
  events["document:DOMContentLoaded"]();
  return { document, toggle, meta, values, events };
}

const first = loadTheme();
assert.equal(first.document.documentElement.dataset.theme, "light");
assert.equal(first.toggle.attributes["aria-label"], "Switch to dark mode");
first.events["button:click"]();
assert.equal(first.document.documentElement.dataset.theme, "dark");
assert.equal(first.toggle.attributes["aria-label"], "Switch to light mode");
assert.equal(first.meta.content, "#111a20");
assert.equal(first.values.get("nscl-theme"), "dark");
first.events["button:click"]();
assert.equal(first.document.documentElement.dataset.theme, "light");

const saved = loadTheme({ saved: "dark" });
assert.equal(saved.document.documentElement.dataset.theme, "dark");
saved.events["system:change"]({ matches: false });
assert.equal(saved.document.documentElement.dataset.theme, "dark", "saved choice overrides system changes");

const automatic = loadTheme({ systemDark: true });
assert.equal(automatic.document.documentElement.dataset.theme, "dark");
automatic.events["system:change"]({ matches: false });
assert.equal(automatic.document.documentElement.dataset.theme, "light");

console.log("Theme checks passed: manual toggle, persistence, system preference, and theme color.");
