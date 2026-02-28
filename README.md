# JSON Builder — Visual JSON Editor

A drag-and-drop JSON editor for building any JSON structure visually. No install, no build step.

## Features

- **Block palette** — drag Object, Array, String, Number, Boolean, or Null blocks onto the canvas
- **Inline editing** — rename keys and edit values directly in the tree
- **Type color system** — blue = object, purple = array, green = string, amber = number, pink = boolean
- **Nested trees** — collapse/expand subtrees, drag to reorder, depth indicated by left-border color
- **Live preview** — syntax-highlighted JSON output in the right panel
- **Edit mode** — paste raw JSON directly; parse errors shown inline
- **Import / Download** — load any `.json` file or save the result

## Running

Open `index.html` directly in a browser. No dependencies, no server required.

```bash
python3 -m http.server 8777
# open http://localhost:8777
```

## Architecture

Single file: `index.html` (~1100 lines, inline CSS + JS). No build step, no dependencies.

State lives in memory only (no `localStorage`). Core structures:

- `root` — root node `{ id, type, key, children, collapsed }`
- `nodeMap` — flat `{ id → node }` for O(1) lookup
- `_drag` — ephemeral drag state `{ source: 'palette'|'canvas', type?, nodeId? }`

Rendering: every state mutation calls `render()` → rebuilds `#tree-root` DOM from scratch → calls `updateOutput()` to refresh the JSON panel.

## Live

→ [ehq.cl](https://ehq.cl/)
