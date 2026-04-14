# Finite Automata Visualizer

An interactive, browser-based tool for building, simulating, and learning about **Deterministic Finite Automata (DFA)** and **Nondeterministic Finite Automata (NFA)** — including epsilon (ε) transitions.

---

## Overview

This project is a zero-dependency, single-page web application built with plain HTML, CSS, and JavaScript. It provides a visual canvas where you can design finite automata by drawing states and transitions, then simulate them step-by-step on any input string.

---

## Features

### Builder
- **Add & delete states** — click the `+ Add State` button or double-click directly on the canvas
- **Rename states** — via the ✎ button in the state list or right-click → Rename on the canvas
- **Set start / accept states** — right-click any state on the canvas for a context menu
- **Add transitions** — use the panel form or the Connect tool to draw arrows between states
- **Multiple edges** — NFA mode allows multiple transitions from the same state on the same symbol; arrows are automatically curved and offset to avoid overlap
- **Epsilon (ε) transitions** — click the `ε` button to insert an epsilon symbol; epsilon arrows render as dashed amber lines on the canvas
- **Delete transitions** — click the ✕ next to any transition in the list
- **Drag to reposition** — switch to the Move tool and drag states anywhere on the canvas

### Simulation
- **Run** — automatically steps through the input string at the chosen speed
- **Step** — manually advance one character at a time
- **Reset** — returns to the initial state
- **Tape display** — visual input tape highlights the current character being read
- **NFA parallel states** — active state set is shown as pills during NFA simulation; ε-closure is computed automatically at every step
- **Speed control** — slider from slow to fast
- **Bottom log bar** — pinned simulation log below the canvas shows every transition step, colour-coded by type (step / accept / reject / warn)

### ⊞ Presets
Five built-in examples to get started instantly:

| Preset | Type | Language |
|---|---|---|
| Even 0s | DFA | Binary strings with an even number of 0s |
| Ends with 1 | DFA | Binary strings ending in 1 |
| Contains 01 | DFA | Binary strings containing the substring "01" |
| Ends with 01 | NFA | Binary strings ending in "01" (demonstrates nondeterminism) |
| ε-NFA: (a\|ab)*b | NFA | Strings over {a,b} matching (a\|ab)*b (demonstrates ε-transitions) |

### Learn
A built-in reference guide covering:
- What is a Finite Automaton (formal 5-tuple definition)
- DFA vs NFA — full comparison table
- Epsilon transitions and ε-closure explained
- Step-by-step guide to designing your own FA
- Key theorems: equivalence, closure properties, DFA minimization, Pumping Lemma
- Common design patterns for both DFA and NFA

---

## File Structure

```
fa-visualizer/
├── index.html    # HTML structure and markup
├── styles.css    # All styling — variables, layout, components
├── app.js        # All JavaScript — data model, canvas rendering, simulation
└── README.md     # This file
```

---

## Getting Started

No build step, no dependencies, no install required.

1. Download or clone the `fa-visualizer/` folder
2. Open `index.html` in any modern browser
3. Start building!

> All three files (`index.html`, `styles.css`, `app.js`) must be in the **same folder** for the app to work correctly.

---

## Design

- **Color palette** — inspired by a vivid sunset: crimson `#8A191F`, red `#FD4219`, orange `#FD7E05`, amber `#FCA201`, lilac `#C77CBF`, purple `#8B276F`, magenta `#B72065`
- **Background** — very dark magenta `#0d000a`
- **Fonts** — [Outfit](https://fonts.google.com/specimen/Outfit) for UI, [Space Mono](https://fonts.google.com/specimen/Space+Mono) for code and labels
- **Canvas grid** — dot grid drawn on the HTML5 canvas (see `app.js` line 72)

---

## How the Simulation Works

| Mode | Transition function | Acceptance |
|---|---|---|
| DFA | δ(state, symbol) → single next state | Final state ∈ accept states |
| NFA | δ(state, symbol) → set of next states | Any active state ∈ accept states |

For NFA, **ε-closure** is computed after every move: all states reachable via zero or more ε-transitions from the current set are added to the active set automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, flexbox, grid) |
| Logic | Vanilla JavaScript (ES6+) |
| Drawing | HTML5 Canvas 2D API |
| Fonts | Google Fonts (loaded via `@import`) |

---

## License

Free to use for educational purposes.
