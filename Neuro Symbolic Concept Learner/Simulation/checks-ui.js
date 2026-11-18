/* Lightweight interaction-state check without a browser or external package. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const NSCL = require("./engine.js");

class Element {
  constructor() {
    this.innerHTML = "";
    this.textContent = "";
    this.hidden = false;
    this.dataset = {};
    this.handlers = {};
    this.classList = { toggle() {} };
  }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  setAttribute(name, value) { this[name] = value; }
  scrollIntoView() {}
  focus() {}
  fire(type, target = this) { assert.ok(this.handlers[type], `missing ${type} handler`); this.handlers[type]({ target }); }
}

const elements = new Map();
const get = selector => {
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector);
};
for (const selector of ["#player", "#score-area", "#score-details", "#answer-reveal", "#prediction-area", "#learning-panel"]) get(selector).hidden = true;
const directionInputs = ["right", "left"].map(value => Object.assign(new Element(), { value }));
const colorInputs = ["blue", "purple"].map(value => Object.assign(new Element(), { value }));
const document = {
  querySelector(selector) { return get(selector); },
  querySelectorAll(selector) {
    if (selector === 'input[name="direction"]') return directionInputs;
    if (selector === 'input[name="target-color"]') return colorInputs;
    return [];
  }
};

vm.runInNewContext(fs.readFileSync("app.js", "utf8"), { document, NSCL });
assert.match(get("#scene-objects").innerHTML, /translate\(835 0\)/);
assert.match(get("#question-heading").innerHTML, /right/);
assert.match(get("#concept-details").innerHTML, /Concepts are visual matches/);
const clickTopic = (topic, text) => get("#algorithm-flow").fire("click", { closest: () => ({ dataset: { topic }, textContent: text }) });
clickTopic("question", "Read the question");
assert.match(get("#concept-details").innerHTML, /Words become an executable program/);
assert.match(get("#concept-details").innerHTML, /relate\(right\)/);
clickTopic("scene", "Read the scene");
get("#concept-details").fire("click", { closest: () => ({ dataset: { concept: "red" } }) });
assert.match(get("#concept-details").innerHTML, /simulated red match 0\.96/);
clickTopic("executor", "Run the instructions");
assert.match(get("#concept-details").innerHTML, /Each result feeds the next step/);
get("#show-how").fire("click");
assert.equal(get("#step-counter").textContent, "1 / 5");
assert.match(get("#model-idea-text").textContent, /object-level representation/);
for (let i = 0; i < 4; i++) get("#next-button").fire("click");
assert.match(get("#answer-reveal").innerHTML, /Blue/);
get("#back-button").fire("click");
assert.equal(get("#step-counter").textContent, "4 / 5");
get("#replay-button").fire("click");
assert.equal(get("#step-counter").textContent, "1 / 5");

directionInputs[1].fire("change");
assert.match(get("#question-heading").innerHTML, /left/);
assert.match(get("#concept-details").innerHTML, /Look left/);
for (let i = 0; i < 4; i++) get("#next-button").fire("click");
assert.match(get("#answer-reveal").innerHTML, /Yellow/);
colorInputs[1].fire("change");
directionInputs[0].fire("change");
for (let i = 0; i < 4; i++) get("#next-button").fire("click");
assert.match(get("#answer-reveal").innerHTML, /Purple/);

get("#count-toggle").fire("click");
assert.match(get("#concept-details").innerHTML, /<span>Count<\/span>/);
for (let i = 0; i < 4; i++) get("#next-button").fire("click");
assert.match(get("#answer-reveal").innerHTML, /<strong>1<\/strong>/);
get("#restore-button").fire("click");
assert.match(get("#question-heading").innerHTML, /What color.*right/);
get("#learning-toggle").fire("click");
assert.equal(get("#learning-panel").hidden, false);
get("#add-decoy").fire("click");
assert.equal(get("#intended-result").textContent, "Blue");
assert.equal(get("#shortcut-result").textContent, "Yellow");
get("#return-button").fire("click");
assert.equal(get("#learning-panel").hidden, true);

console.log("Interaction-state checks passed: steps, Back, Replay, edits, count, reset, learning return.");
