(function () {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const state = { direction: "right", targetColor: "blue", query: "color", step: -1, started: false, prediction: null, scoresOpen: false, decoy: false, conceptTopic: "scene", conceptWord: "sphere" };
  const STEP_NAMES = ["All objects", "Red sphere", "Right or left", "Only cubes", "The answer"];
  const upper = value => String(value).charAt(0).toUpperCase() + String(value).slice(1);
  const current = () => {
    const scene = NSCL.createScene(state.targetColor);
    const program = NSCL.createProgram(state.direction, state.query);
    return { scene, program, result: NSCL.execute(scene, program) };
  };

  function objectSVG(object, status, reference) {
    const { id, x, shape, color } = object;
    const groupClass = `object ${status || ""} ${reference ? "is-reference" : ""}`;
    const ring = reference ? '<rect class="reference-ring" x="-76" y="208" width="152" height="170" rx="28"/>' :
      status === "is-candidate" ? '<rect class="candidate-ring" x="-76" y="208" width="152" height="170" rx="28"/>' : "";
    let form;
    if (shape === "cube") {
      const front = color === "purple" ? "purple-face" : color === "yellow" ? "yellow-face" : "blue-face";
      const side = color === "yellow" ? "#be8d2c" : color === "purple" ? "#69409b" : "#28518f";
      const top = color === "yellow" ? "#ffe49a" : color === "purple" ? "#d5b4ed" : "#a4c6ef";
      form = `<path d="M-61 254 L-42 233 H65 L45 254 Z" fill="${top}"/><path d="M45 254 L65 233 V341 L45 360 Z" fill="${side}"/><path d="M-61 254 H45 V360 H-61 Z" fill="url(#${front})"/><path d="M-61 254 L-42 233 H65 V341 L45 360 H-61 Z" fill="none" stroke="#372f2a" stroke-opacity=".27" stroke-width="2"/><path d="M45 254 V360" stroke="#372f2a" stroke-opacity=".2" stroke-width="2"/>`;
    } else if (shape === "sphere") {
      form = '<circle cx="0" cy="294" r="65" fill="url(#red-ball)" stroke="#a22d2e" stroke-width="2"/><ellipse cx="-19" cy="262" rx="21" ry="11" fill="#fff" opacity=".23" transform="rotate(-29 -19 262)"/>';
    } else {
      const green = color === "green";
      form = `<path d="M-57 254 V348 C-57 366 57 366 57 348 V254 Z" fill="${green ? "url(#green-side)" : "url(#yellow-side)"}"/><ellipse cx="0" cy="348" rx="57" ry="18" fill="${green ? "#297454" : "#b98727"}"/><ellipse cx="0" cy="254" rx="57" ry="18" fill="${green ? "#91d5a7" : "#ffe18a"}" stroke="#372f2a" stroke-opacity=".22" stroke-width="2"/><path d="M-57 254 V348 M57 254 V348" stroke="#372f2a" stroke-opacity=".25" stroke-width="2"/>`;
    }
    const marker = reference ? '<text class="reference-tag" x="0" y="196" text-anchor="middle">REFERENCE</text>' : status === "is-candidate" ? '<text class="candidate-tag" x="0" y="196" text-anchor="middle">CANDIDATE</text>' : "";
    const excluded = status === "is-excluded" ? '<path class="excluded-mark" d="M-8 194 L8 210 M8 194 L-8 210"/>' : "";
    return `<g class="${groupClass}" transform="translate(${x} 0)"><ellipse cx="3" cy="382" rx="76" ry="17" fill="#5d5146" opacity=".16"/>${ring}${form}${marker}${excluded}<g class="object-id"><rect x="-18" y="405" width="36" height="36" rx="18"/><text x="0" y="429" text-anchor="middle">${id}</text></g></g>`;
  }

  function drawMainScene(scene, result) {
    const stage = state.step < 0 ? null : result.stages[state.step];
    const statusFor = id => !stage || state.step === 0 ? "" : stage.active.includes(id) ? "is-candidate" : stage.excluded.includes(id) ? "is-excluded" : "";
    const guide = state.step === 2 ? spatialGuide(result.direction) : "";
    $("#spatial-guide").innerHTML = guide;
    $("#scene-objects").innerHTML = scene.map(object => objectSVG(object, statusFor(object.id), stage?.reference === object.id)).join("");
    const text = scene.map(object => `${object.id}: ${object.color} ${object.shape}`).join("; ");
    $("#scene-description").textContent = `${text}. From left to right. ${state.step < 0 ? "No reasoning step selected." : `Step ${state.step + 1}: ${stepExplanation(result, scene, state.step)}`}`;
    $("#scene-text").textContent = scene.map(object => `${object.id} ${object.color} ${object.shape}`).join(" · ");
    $("#scene-status").textContent = state.step === 2 ? `${result.spatial.length} object${result.spatial.length === 1 ? "" : "s"} ${result.direction} of B` : "Four objects on a table";
  }

  function spatialGuide(direction) {
    const right = direction === "right";
    const start = right ? 456 : 314;
    const end = right ? 960 : 40;
    const arrow = right ? "M946 178 L960 185 L946 192" : "M54 178 L40 185 L54 192";
    const rectX = right ? 456 : 40;
    return `<rect class="spatial-wash" x="${rectX}" y="135" width="${Math.abs(end - start)}" height="246"/><path class="spatial-arrow" d="M${start} 185 H${end}" stroke-dasharray="8 8"/><path class="spatial-arrow" d="${arrow}"/><text x="${right ? 705 : 177}" y="163" class="guide-label" text-anchor="middle">${direction.toUpperCase()} OF B</text>`;
  }

  function stepExplanation(result, scene, step) {
    if (step === 0) return "The scene reader proposes four separate objects. Their labels stay with them as we reason.";
    if (step === 1) return "B is the best match for “red sphere,” so it becomes our reference object.";
    if (step === 2) return result.direction === "right" ? "C and D are both right of B. The green cylinder survives this step." : "Only A lies left of B. The objects on the right are excluded.";
    if (step === 3) return result.direction === "right" ? "D is a cube, so it stays. C is a cylinder, so it drops out; A was already excluded." : "A is a cube, so it stays. The other cube was excluded by position.";
    if (result.query === "count") return `Count the remaining cube${result.cubes.length === 1 ? "" : "s"}: ${result.answer}.`;
    return `Read ${result.cubes[0] || "the remaining object"}'s color: ${upper(result.answer)}.${scene.find(object => object.id === "D")?.color === "purple" && result.cubes.includes("D") ? " Only the color readout changed." : ""}`;
  }

  function stepInstruction(result, step) {
    return ["allObjects()", "find(red, sphere)", `relate(${result.direction})`, "filter(cube)", result.query === "count" ? "count()" : "queryColor()"][step];
  }

  function modelIdea(result, step) {
    return [
      "Visual perception makes an object-level representation of the image. These four objects are authored for this exhibit.",
      "A visual concept is a learned pattern such as red or sphere. An object can match it more or less strongly.",
      "A relation such as right is evaluated from a reference object, here B.",
      "This is compositionality: the cube filter receives only the objects that survived the relation step.",
      result.query === "count" ? "The final operation counts the surviving objects; the earlier operations stay the same." : "The final operation queries a surviving object's color; the earlier operations selected it."
    ][step];
  }

  function renderQuestion() {
    const direction = state.direction;
    const count = state.query === "count";
    $("#question-heading").innerHTML = count ? `How many cubes are <em>to the ${direction} of</em> the red sphere?` : `What color is the cube <em>to the ${direction} of</em> the red sphere?`;
    const parts = count ? [["How many", 4], ["cubes", 3], [`to the ${direction} of`, 2], ["the red sphere", 1]] : [["What color", 4], ["the cube", 3], [`to the ${direction} of`, 2], ["the red sphere", 1]];
    $("#phrase-question").innerHTML = parts.map(([label, step]) => `<button type="button" class="phrase" data-step="${step}" aria-label="Show instruction for ${label}">${label}</button>`).join(" ") + '<span class="question-mark">?</span>';
    $("#challenge-direction").textContent = direction;
    $("#count-toggle").textContent = count ? "Return to color question" : "Try the count question";
    $("#count-toggle").setAttribute("aria-pressed", String(count));
  }

  function renderGuess() {
    const options = state.query === "count" ? [0, 1, 2, 3] : NSCL.createScene(state.targetColor).map(object => object.color);
    $("#guess-options").innerHTML = options.map(value => `<button type="button" class="guess-chip ${typeof value === "string" ? `chip-${value}` : ""}" data-guess="${value}">${upper(value)}</button>`).join("");
    $("#guess-area").hidden = state.started;
    $("#guess-area .guess-heading").innerHTML = state.query === "count" ? "Make a guess <span>How many?</span>" : "Make a guess <span>What color?</span>";
  }

  function renderPlayer(scene, result) {
    $("#player").hidden = !state.started;
    if (!state.started) return;
    const step = Math.max(state.step, 0);
    $("#step-counter").textContent = `${step + 1} / 5`;
    $("#step-list").innerHTML = STEP_NAMES.map((name, index) => `<li><button type="button" class="step-item ${index === step ? "active" : ""}" data-step="${index}" ${index === step ? 'aria-current="step"' : ""}><span>${String(index + 1).padStart(2, "0")}</span>${index === 2 ? `${upper(result.direction)} of B` : index === 4 && result.query === "count" ? "Count cubes" : name}</button></li>`).join("");
    $("#active-step-index").textContent = `STEP ${String(step + 1).padStart(2, "0")}`;
    $("#step-title").textContent = step === 2 ? `Look to the ${result.direction}` : step === 4 && result.query === "count" ? "Count what remains" : ["Start with four objects", "Find the red sphere", "", "Keep only the cubes", "Read the color"][step];
    $("#step-explanation").textContent = stepExplanation(result, scene, step);
    $("#step-instruction").textContent = stepInstruction(result, step);
    $("#model-idea-text").textContent = modelIdea(result, step);
    $("#back-button").disabled = step === 0;
    $("#next-button").disabled = step === 4;
    $("#next-button").textContent = step === 3 ? "Reveal answer →" : "Next →";
    $("#score-area").hidden = step !== 1;
    $("#score-toggle").setAttribute("aria-expanded", String(state.scoresOpen));
    $("#score-toggle").textContent = state.scoresOpen ? "Hide simulated scores" : "Show all simulated scores";
    $("#score-details").hidden = !state.scoresOpen;
    $("#score-details").innerHTML = scene.map(object => `<div><strong>${object.id} · ${upper(object.color)} ${object.shape}</strong><span>sphere ${NSCL.SIMULATED_SCORES.sphere[object.id].toFixed(2)} · red ${NSCL.SIMULATED_SCORES.red[object.id].toFixed(2)} · cube ${NSCL.SIMULATED_SCORES.cube[object.id].toFixed(2)}</span></div>`).join("");
    $("#answer-reveal").hidden = step !== 4;
    $("#answer-reveal").innerHTML = step === 4 ? `<span>ANSWER</span><strong>${upper(result.answer)}</strong>` : "";
    $("#algorithm-jump").hidden = step !== 4;
    const finalFn = result.query === "count" ? "count" : "queryColor";
    $("#full-program").textContent = `Read from the inside out: 1 → 5\n\n${finalFn}(                 // 5\n  filterCube(          // 4\n    ${result.direction}Of(          // 3\n      findRedSphere(   // 2\n        allObjects()   // 1\n      )\n    )\n  )\n)`;
    document.querySelectorAll(".phrase").forEach(button => button.classList.toggle("active", Number(button.dataset.step) === step));
  }

  function renderPrediction(result) {
    const show = state.direction !== "right" || state.targetColor !== "blue" || state.query === "count";
    $("#prediction-area").hidden = !show;
    if (!show) return;
    const options = state.query === "count" ? [0, 1, 2, 3] : ["yellow", "blue", "purple"];
    $("#prediction-options").innerHTML = options.map(value => `<button type="button" class="prediction-chip ${String(state.prediction) === String(value) ? "selected" : ""}" data-prediction="${value}" aria-pressed="${String(state.prediction) === String(value)}">${upper(value)}</button>`).join("");
    $("#prediction-feedback").textContent = state.prediction === null ? "" : String(state.prediction) === String(result.answer) ? "Good prediction. Replay to see why." : "Interesting prediction. Replay to see which object survives.";
    $("#run-edited").textContent = state.started ? "Replay with this change →" : "Show this reasoning →";
  }

  function renderLearning() {
    const scene = NSCL.createScene("blue").map((object, index) => ({ ...object, x: [120, 320, 520, 720][index] }));
    if (state.decoy) scene.push({ id: "E", x: 920, shape: "cylinder", color: "yellow" });
    const result = NSCL.execute(scene, NSCL.createProgram("right", "color"));
    $("#learning-scene").innerHTML = `<rect width="1000" height="510" fill="#f2eee5"/><path d="M0 356 H1000 V510 H0Z" fill="#d7cdbc"/><path d="M0 356 H1000" stroke="#b9ae99" stroke-width="3"/>${scene.map(object => objectSVG(object, "", false)).join("")}`;
    $("#learning-scene").setAttribute("aria-label", `From left to right: ${scene.map(object => `${object.color} ${object.shape}`).join(", ")}.`);
    $("#intended-result").textContent = upper(result.answer);
    $("#shortcut-result").textContent = upper([...scene].sort((a, b) => a.x - b.x).at(-1).color);
    $("#add-decoy").textContent = state.decoy ? "Remove the extra cylinder" : "Add yellow cylinder at far right";
    $("#add-decoy").setAttribute("aria-pressed", String(state.decoy));
    $("#shortcut-insight").textContent = state.decoy ? "The intended program still finds D, the blue cube. The shortcut follows E and answers yellow. Their earlier agreement hid a different reasoning path." : "Both agree here. One answer alone does not show which path the system used.";
  }

  function renderConcepts(scene, program, result) {
    document.querySelectorAll(".flow-stage").forEach(button => {
      const active = button.dataset.topic === state.conceptTopic;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const detail = $("#concept-details");
    if (state.conceptTopic === "scene") {
      const word = state.conceptWord;
      const choices = ["red", "sphere", "cube"].map(concept => `<button type="button" class="concept-word ${concept === word ? "active" : ""}" data-concept="${concept}" aria-pressed="${concept === word}">${concept}</button>`).join("");
      const rows = scene.map(object => {
        const score = NSCL.SIMULATED_SCORES[word][object.id];
        return `<div class="match-row"><span>${object.id} · ${upper(object.color)} ${object.shape}</span><div class="match-track" role="img" aria-label="${object.id}: simulated ${word} match ${score.toFixed(2)}"><span class="match-fill ${score >= .8 ? "strong" : ""}" style="width:${Math.round(score * 100)}%"></span></div><strong>${score.toFixed(2)}</strong></div>`;
      }).join("");
      detail.innerHTML = `<div class="concept-copy"><span class="eyebrow">VISUAL PERCEPTION</span><h3>Concepts are visual matches.</h3><p>The paper's perception module proposes object regions, represents each one, and compares it with learned concepts such as “red,” “sphere,” and “cube.” The question supplies the words to look for; it does not supply object labels.</p><p class="concept-caption">Select a concept. These scores are simulated; a higher number means a stronger visual match.</p></div><div class="concept-demonstration"><div class="concept-choices" role="group" aria-label="Choose a visual concept">${choices}</div><div class="match-rows">${rows}</div></div>`;
    } else if (state.conceptTopic === "question") {
      const steps = program.map((instruction, index) => `<li><span class="chain-number">${index + 1}</span><strong>${instruction.label}</strong><code>${stepInstruction(result, index)}</code></li>`).join("");
      detail.innerHTML = `<div class="concept-copy"><span class="eyebrow">SEMANTIC PARSING</span><h3>Words become an executable program.</h3><p>A semantic parser translates a sentence into ordered operations. In NS-CL, the parser learns which program fits a question from training examples. The program tells the executor what to do with the scene's objects.</p><p class="concept-caption">Changing “right” to “left” changes operation 3. Asking “how many” changes operation 5.</p></div><ol class="instruction-chain">${steps}</ol>`;
    } else {
      const labels = ["Start", "Find red sphere", `Look ${result.direction}`, "Keep cubes"];
      const stageRows = result.stages.slice(0, 4).map((stage, index) => `<div class="candidate-row"><span>${labels[index]}</span><strong>${stage.active.length ? stage.active.map(id => `<span class="mini-object">${id}</span>`).join("") : "none"}</strong></div>`).join("");
      detail.innerHTML = `<div class="concept-copy"><span class="eyebrow">QUASI-SYMBOLIC EXECUTION</span><h3>Each result feeds the next step.</h3><p>The executor follows the program's operations in order. A candidate can pass the position test and fail the shape test—as C does in the opening puzzle. The final operation reads a color or counts what remains.</p><p class="concept-caption">The research model carries soft strengths for each object between operations. This exhibit shows the strongest candidates as clear selections.</p></div><div class="candidate-ladder" aria-label="Current execution trace">${stageRows}<div class="candidate-row final"><span>${result.query === "count" ? "Count" : "Read color"}</span><strong>${upper(result.answer)}</strong></div></div>`;
    }
  }

  function render() {
    const { scene, program, result } = current();
    renderQuestion();
    drawMainScene(scene, result);
    renderGuess();
    renderPlayer(scene, result);
    renderPrediction(result);
    renderLearning();
    renderConcepts(scene, program, result);
    document.querySelector(`input[name="direction"][value="${state.direction}"]`).checked = true;
    document.querySelector(`input[name="target-color"][value="${state.targetColor}"]`).checked = true;
  }

  function announce(message) { $("#announcer").textContent = message; }
  function goToStep(step, scroll) {
    state.started = true;
    state.step = Math.min(4, Math.max(0, step));
    render();
    const { result, scene } = current();
    announce(`Step ${state.step + 1} of 5. ${stepExplanation(result, scene, state.step)}${state.step === 4 ? ` Answer: ${upper(result.answer)}.` : ""}`);
    if (scroll) $(".exhibit").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editPuzzle() {
    state.prediction = null;
    if (state.started) state.step = 0;
    $("#guess-feedback").textContent = "";
    render();
    announce(`Puzzle changed. The question is ${NSCL.questionText(state.direction, state.query)} Predict, then replay.`);
  }

  $("#show-how").addEventListener("click", () => goToStep(0, false));
  $("#guess-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-guess]");
    if (!button) return;
    const guess = button.dataset.guess;
    const { result } = current();
    const correct = guess === String(result.answer);
    let feedback = correct ? `Yes — ${upper(result.answer)}. Now follow the steps that make it certain.` :
      guess === "yellow" ? "You found a cube. Watch which side of the red sphere it’s on." :
      guess === "green" ? "You found an object on the right. Watch what happens when we keep only cubes." :
      "Look at the position first, then the shape. The walkthrough will show the survivor.";
    $("#guess-feedback").textContent = feedback;
    document.querySelectorAll(".guess-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
    announce(feedback);
  });
  $("#phrase-question").addEventListener("click", event => {
    const button = event.target.closest("button[data-step]");
    if (button) goToStep(Number(button.dataset.step), false);
  });
  $("#step-list").addEventListener("click", event => {
    const button = event.target.closest("button[data-step]");
    if (button) goToStep(Number(button.dataset.step), false);
  });
  $("#back-button").addEventListener("click", () => goToStep(state.step - 1, false));
  $("#next-button").addEventListener("click", () => goToStep(state.step + 1, false));
  $("#replay-button").addEventListener("click", () => goToStep(0, false));
  $("#score-toggle").addEventListener("click", () => { state.scoresOpen = !state.scoresOpen; render(); });
  $("#algorithm-flow").addEventListener("click", event => {
    const button = event.target.closest("button[data-topic]");
    if (!button) return;
    state.conceptTopic = button.dataset.topic;
    const { scene, program, result } = current();
    renderConcepts(scene, program, result);
    announce(`Exploring ${button.textContent.trim()}.`);
  });
  $("#concept-details").addEventListener("click", event => {
    const button = event.target.closest("button[data-concept]");
    if (!button) return;
    state.conceptWord = button.dataset.concept;
    const { scene, program, result } = current();
    renderConcepts(scene, program, result);
    $(`#concept-details button[data-concept="${state.conceptWord}"]`).focus({ preventScroll: true });
    announce(`Showing simulated ${state.conceptWord} matches for objects A through D.`);
  });
  document.querySelectorAll('input[name="direction"]').forEach(input => input.addEventListener("change", event => { state.direction = event.target.value; editPuzzle(); }));
  document.querySelectorAll('input[name="target-color"]').forEach(input => input.addEventListener("change", event => { state.targetColor = event.target.value; editPuzzle(); }));
  $("#count-toggle").addEventListener("click", () => { state.query = state.query === "count" ? "color" : "count"; editPuzzle(); });
  $("#prediction-options").addEventListener("click", event => {
    const button = event.target.closest("button[data-prediction]");
    if (!button) return;
    state.prediction = button.dataset.prediction;
    renderPrediction(current().result);
  });
  $("#run-edited").addEventListener("click", () => goToStep(0, true));
  $("#restore-button").addEventListener("click", () => {
    Object.assign(state, { direction: "right", targetColor: "blue", query: "color", prediction: null, step: state.started ? 0 : -1 });
    $("#guess-feedback").textContent = "";
    render();
    announce("Original puzzle restored. Four objects; the answer is found by replaying the steps.");
  });
  $("#learning-toggle").addEventListener("click", () => {
    const open = $("#learning-panel").hidden;
    $("#learning-panel").hidden = !open;
    $("#learning-toggle").setAttribute("aria-expanded", String(open));
    if (open) $("#learning-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#add-decoy").addEventListener("click", () => { state.decoy = !state.decoy; renderLearning(); announce($("#shortcut-insight").textContent); });
  $("#return-button").addEventListener("click", () => {
    $("#learning-panel").hidden = true;
    $("#learning-toggle").setAttribute("aria-expanded", "false");
    $(".exhibit").scrollIntoView({ behavior: "smooth", block: "start" });
    (state.started ? document.querySelector(".step-item.active") : $("#show-how")).focus({ preventScroll: true });
  });

  render();
})();
