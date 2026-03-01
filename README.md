<div align="center">

# JSON Studio — Visual JSON Builder

Build any JSON structure by dragging typed blocks. Edit keys and values inline, preview with syntax highlighting, import or export instantly. No install, no build step.

[![Live][badge-site]][url-site]
[![HTML5][badge-html]][url-html]
[![CSS3][badge-css]][url-css]
[![JavaScript][badge-js]][url-js]
[![Claude Code][badge-claude]][url-claude]
[![License][badge-license]](LICENSE)

[badge-site]:    https://img.shields.io/badge/live_site-0063e5?style=for-the-badge&logo=googlechrome&logoColor=white
[badge-html]:    https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white
[badge-css]:     https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white
[badge-js]:      https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[badge-claude]:  https://img.shields.io/badge/Claude_Code-CC785C?style=for-the-badge&logo=anthropic&logoColor=white
[badge-license]: https://img.shields.io/badge/license-MIT-404040?style=for-the-badge

[url-site]:   https://jsonstudio.neorgon.com/
[url-html]:   #
[url-css]:    #
[url-js]:     #
[url-claude]: https://claude.ai/code

</div>

---

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

→ [jsonstudio.neorgon.com](https://jsonstudio.neorgon.com/)

---

<div align="center">
  <sub>Part of <a href="https://neorgon.com">Neorgon</a></sub>
</div>
