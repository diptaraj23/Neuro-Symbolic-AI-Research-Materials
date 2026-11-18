# See the reasoning

An interactive teaching simulation of the algorithm in Mao et al., [*The Neuro-Symbolic Concept Learner* (ICLR 2019)](https://nscl.csail.mit.edu/data/papers/2019ICLR-NSCL.pdf). It shows how scene perception, question parsing, and program execution produce an answer, with an editable puzzle, execution trace, and short explanation of learning.

## Start

Double-click `index.html` in a recent browser with JavaScript enabled. The simulation runs locally from `file://` with no install, build, server, or API. Paper links require internet access. The header switch controls dark mode.

## Technical details

The app uses vanilla HTML, CSS, and JavaScript. `engine.js` holds the scene data, supported question templates, illustrative scores, and executor; `app.js` renders the interface from the executor's intermediate results. `theme.js` handles the saved or system theme, and `styles.css` defines both themes and responsive layouts.

This is an educational model with authored scenes and exact filtering, not the trained NS-CL network. To run the optional Node.js checks from this folder: `node checks.js`, `node checks-ui.js`, and `node checks-theme.js`.
