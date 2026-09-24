# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Three JSON tools on one static site, no build step, no dependencies, no `npm install`:

| Tool | Where | Shape |
|---|---|---|
| Builder (drag typed blocks into a JSON tree) | `index.html`, `js/`, `css/style.css` | ES modules |
| Visualizer (searchable table, stats, pivot, timeline, org tree) | `visualizer/` | ES modules |
| Visualizer embed (the viewer inside someone else's page) | `visualizer/embed.html`, `visualizer/js/embed.js` | ES modules, chrome-less |
| Scrambler (anonymise JSON) | `scrambler/index.html` | single file |

`make serve` on port 8802. `make test` runs the Node suite, `make test-browser` serves the site for `tests/browser.html`.

## Builder

`js/state.js` exports `state`: `root` (node `{ id, type, key, children, collapsed }`), `nodeMap` (flat id lookup), `idCounter`, `drag` (`{ source: 'palette'|'canvas', type?, nodeId? }`) and `editMode`. Leaf nodes carry `value` instead of `children`.

Every mutation calls `render()` in `js/render.js`, which rebuilds `#tree-root` from scratch and calls `updateOutput()` for the JSON panel. No diffing. `js/events.js` wires the palette, drag-and-drop, templates, import, download and `openInViewer()`, which writes the JSON to `sessionStorage['viewer-import']` and navigates to the Visualizer. `js/utils.js` holds `nodeToValue`, `jsonToTree` and the tree operations.

Buttons in `index.html` still use inline `onclick` and reach functions the module exposes on `window`. Convert them when touching the file; do not add new ones.

## Visualizer

One module per concern under `visualizer/js/`: `load.js` (parse, detect, render, view switch), `table.js` (structure detection, sort, table, heat map), `filter.js` (search, column filters, column visibility), `pivot.js` (period metrics pivot and the timeline SVG), `tree.js` (org tree from records that reference each other), `modal.js`, `stats.js`, `export.js`, `demos.js`. `state.js` is one mutable object plus the `#v=` URL view state.

Load flow: `loadJSON(text)` parses and calls `loadValue(parsed)`, which detects the structure, resets the viewer, detects pivot eligibility, renders, and switches views. Both return `true` on success and `false` with the reason in `#error-msg`. `loadJSON` also keeps a session copy in `sessionStorage['viewer-session-json']` unless `state.embedded` is set.

`events.js` has two halves: `initInputEvents()` (paste, upload, demos, and the two buttons that return to the input view) and `initViewerEvents()` (everything from the search bar down). `index.html` calls `initEvents()`, which is both; `embed.html` has no input view and calls only the viewer half.

## The embed

`embed.html` carries a copy of the viewer block from `index.html`, minus the Reset button, wrapped in a caption, an error line, a waiting placeholder and a footer with the JSON Studio mark. `js/embed.js` boots it; `js/embed-params.js` is the URL contract as pure functions; `embed-builder.html` and `js/embed-builder.js` configure one live and write the snippet.

The rules, each pinned by a test:

- **Data arrives only by `postMessage`** (`jsonstudio:load`), never in the URL. Presentation settings live in the query string; the contract is documented at the top of `embed.js`.
- **The embed writes nothing.** `state.embedded = true` makes `loadJSON` skip the session copy and `pushViewState` skip the URL hash. It never reads `viewer-import` or `viewer-session-json` either.
- **Its CSP names no host but its own** (`default-src 'none'`, `connect-src 'none'`). No header kit, no season stylesheet, no analytics beacons. A host can read that promise off the page source, so do not add a third-party URL to `embed.html` for any reason.
- **Replies go only to the origin that sent the data**, once one has. `ready` and `height` go to `'*'` because they carry nothing from any payload.
- Framing cannot be restricted on GitHub Pages (no response headers; `frame-ancestors` is ignored in a meta CSP). Anyone may embed it; the design accepts that.

## Tests

- `tests/*.test.mjs`, Node's own runner: the URL contract round-trips, and `embed.html` stays in step with the viewer block of `index.html` (every id the viewer modules look up exists in both).
- `tests/browser.html`: boots the embed, the builder and the full page in iframes; console errors are failures. It drives the whole postMessage contract, checks that the embed wrote nothing to storage or the URL, and reads the embed's resource timing to prove nothing off-origin was requested.

## Gotchas

- **The viewer modules find elements by id, on two pages.** An id added to the viewer block of `index.html` must be added to `embed.html` too, or the first click on it throws in the embed. `tests/embed-dom.test.mjs` fails on the drift. The Reset handler shipped for months looking up `btn-collapse-all`, an id that existed nowhere, and threw before it cleared the session copy; fixed 2026-09-23 when the events split moved that handler.
- **A `?` lookup is the only lookup allowed to miss.** `load.js` guards `view-input`, `btn-new-json` and `btn-reset` because the embed has none of them; every other `$()` must resolve on both pages.
- **The embed handshake has two triggers on purpose.** The embed posts `ready` while its module evaluates, which can be before a host attached its listener, so the builder (and the snippet it writes) also sends on the iframe's `load` event and lets whichever comes first win.
- **`fit=content` measures the body, not the document.** `documentElement.scrollHeight` never drops below the iframe's own height, so a host could never shrink the frame; `body.getBoundingClientRect().height` is the data's height.
- **`visualizer/README.md` states the privacy position honestly.** The full page loads the fleet's pageview beacons through the header kit; only the embed loads none. Keep the two descriptions distinct.

## Design Tokens

| Token | Value |
|---|---|
| Background | `#040714` |
| Glass cards | `rgba(255,255,255,.03)` |
| Blue accent / active state | `#0063e5` |
| Header gradient | `135deg, #B015B0 0%, #3D0080 45%, #080010 100%` |
| Font | Avenir Next then the system-ui fallback chain |

**Type color system:**

| Type | Color |
|---|---|
| object | `#0063e5` (blue) |
| array | `#7c3aed` (purple) |
| string | `#10b981` (green) |
| number | `#f59e0b` (amber) |
| boolean | `#ec4899` (pink) |
| null | `#6b7280` (gray) |
