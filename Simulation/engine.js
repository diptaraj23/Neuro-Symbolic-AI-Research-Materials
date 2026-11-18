/* Authored scene data, supported question templates, and one shared executor.
   The scores below are illustrative, not the output of a trained model. */
(function (root) {
  "use strict";

  const ORIGINAL_SCENE = Object.freeze([
    { id: "A", x: 160, shape: "cube", color: "yellow" },
    { id: "B", x: 385, shape: "sphere", color: "red" },
    { id: "C", x: 610, shape: "cylinder", color: "green" },
    { id: "D", x: 835, shape: "cube", color: "blue" }
  ]);

  const QUESTION_TEMPLATES = Object.freeze({
    color: "What color is the cube to the {direction} of the red sphere?",
    count: "How many cubes are to the {direction} of the red sphere?"
  });

  const SIMULATED_SCORES = Object.freeze({
    sphere: { A: 0.08, B: 0.97, C: 0.17, D: 0.06 },
    red: { A: 0.05, B: 0.96, C: 0.08, D: 0.07 },
    cube: { A: 0.96, B: 0.12, C: 0.20, D: 0.94 }
  });

  function createScene(targetColor) {
    return ORIGINAL_SCENE.map(object => ({
      ...object,
      color: object.id === "D" ? (targetColor || "blue") : object.color
    }));
  }

  function createProgram(direction, query) {
    return [
      { operation: "scene", label: "Start with every object" },
      { operation: "filter", concept: ["red", "sphere"], label: "Find the red sphere" },
      { operation: "relate", direction, label: `Look to its ${direction}` },
      { operation: "filter", concept: ["cube"], label: "Keep the cubes" },
      { operation: query === "count" ? "count" : "queryColor", label: query === "count" ? "Count the remaining cubes" : "Read the remaining color" }
    ];
  }

  function execute(scene, program) {
    const all = [...scene].sort((a, b) => a.x - b.x);
    const ids = list => list.map(object => object.id);
    let selected = [];
    let reference = null;
    let spatial = [];
    let cubes = [];
    let answer = null;
    let direction = "right";
    let query = "queryColor";
    const stages = [];

    for (const instruction of program) {
      switch (instruction.operation) {
        case "scene":
          selected = all;
          break;
        case "filter":
          selected = selected.filter(object => instruction.concept.every(concept => object.color === concept || object.shape === concept));
          if (instruction.concept.includes("sphere")) reference = selected[0] || null;
          if (instruction.concept.includes("cube")) cubes = selected;
          break;
        case "relate":
          direction = instruction.direction;
          selected = reference ? all.filter(object => direction === "right" ? object.x > reference.x : object.x < reference.x) : [];
          spatial = selected;
          break;
        case "count":
          query = "count";
          answer = selected.length;
          break;
        case "queryColor":
          query = "queryColor";
          answer = selected[0]?.color || "none";
          break;
        default:
          throw new Error(`Unknown program operation: ${instruction.operation}`);
      }
      stages.push({
        active: ids(selected),
        excluded: ids(all.filter(object => object.id !== reference?.id && !selected.includes(object))),
        reference: instruction.operation === "scene" ? null : (reference?.id || null)
      });
    }

    return {
      all: ids(all),
      reference: reference?.id || null,
      spatial: ids(spatial),
      cubes: ids(cubes),
      answer,
      direction,
      query,
      stages
    };
  }

  function questionText(direction, query) {
    return QUESTION_TEMPLATES[query].replace("{direction}", direction);
  }

  const api = { ORIGINAL_SCENE, QUESTION_TEMPLATES, SIMULATED_SCORES, createScene, createProgram, execute, questionText };
  root.NSCL = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
