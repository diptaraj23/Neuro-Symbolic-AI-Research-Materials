/* Optional logic checks: run with `node checks.js`. The app itself needs no runtime. */
const assert = require("node:assert/strict");
const NSCL = require("./engine.js");

function run(direction, color, query) {
  const scene = NSCL.createScene(color);
  return NSCL.execute(scene, NSCL.createProgram(direction, query));
}

assert.equal(run("right", "blue", "color").answer, "blue");
assert.equal(run("left", "blue", "color").answer, "yellow");
assert.equal(run("right", "purple", "color").answer, "purple");
assert.equal(run("left", "purple", "color").answer, "yellow");
assert.equal(run("right", "blue", "count").answer, 1);
assert.equal(run("left", "blue", "count").answer, 1);
assert.deepEqual(run("right", "blue", "color").spatial, ["C", "D"]);
assert.deepEqual(run("right", "blue", "color").cubes, ["D"]);
assert.deepEqual(run("right", "blue", "color").stages[2].active, ["C", "D"]);
assert.deepEqual(run("right", "blue", "color").stages[3].active, ["D"]);
assert.ok(run("right", "blue", "color").stages[3].excluded.includes("A"));
assert.ok(run("right", "blue", "color").stages[3].excluded.includes("C"));
assert.equal(NSCL.createScene("blue")[3].color, "blue", "restoring the original scene resets D");
assert.deepEqual(NSCL.createProgram("right", "count").map(step => step.operation), ["scene", "filter", "relate", "filter", "count"]);

const learningScene = NSCL.createScene("blue");
learningScene.push({ id: "E", x: 1050, shape: "cylinder", color: "yellow" });
assert.equal(NSCL.execute(learningScene, NSCL.createProgram("right", "color")).answer, "blue");
assert.equal(learningScene.at(-1).color, "yellow", "the rightmost shortcut changes answer");

console.log("All 16 NS-CL execution checks passed.");
