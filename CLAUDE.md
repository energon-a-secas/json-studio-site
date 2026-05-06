# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A visual, block-based JSON editor. Single file: `index.html` with inline CSS and inline JS, ~1100 lines. No build step, no dependencies.

`adjuster.html` is an unrelated tool (JIRA story points adjuster) that lives here but is not part of this project.

## Architecture

Everything is self-contained in `index.html`.

**State model (in-memory only, no localStorage):**
- `root` — the root node `{ id: 0, type, key, children, collapsed }`
- `nodeMap` — flat `{ id → node }` lookup for O(1) access
- `idCounter` — auto-increment for node IDs
- `_drag` — ephemeral drag state `{ source: 'palette'|'canvas', type?, nodeId? }`

**Node shape:**
- Container nodes (`object`, `array`): `{ id, type, key, children: [], collapsed }`
- Leaf nodes (`string`, `number`, `boolean`, `null`): `{ id, type, key, value }`

**Rendering pipeline:** All state mutations call `render()` → rebuilds the entire `#tree-root` DOM from scratch → calls `updateOutput()` to re-render the JSON panel. No virtual DOM or diffing.

**Drag-and-drop:** Two sources — palette blocks (create new node) and canvas drag handles (move existing node). Drop targets are `.drop-zone` elements (between nodes) and `.empty-drop` elements (into empty containers). The `_drag` global tracks the active drag.

**JSON ↔ Tree:**
- `nodeToValue(node)` — tree → JS value (used for output)
- `jsonToTree(value, key)` — JS value → node tree (used for import/paste)
- `loadFromValue(value)` — resets state and rebuilds tree from a parsed JS value

**Edit mode:** The right panel toggles between a syntax-highlighted `<pre>` view and a raw textarea. "Apply" parses the textarea content, calls `loadFromValue`, and exits edit mode.

## Design Tokens

| Token | Value |
|---|---|
| Background | `#040714` |
| Glass cards | `rgba(255,255,255,.03)` |
| Blue accent / active state | `#0063e5` |
| Header gradient | `135deg, #B015B0 0%, #3D0080 45%, #080010 100%` |
| Font | Avenir Next → system-ui fallback chain |

**Type color system:**

| Type | Color |
|---|---|
| object | `#0063e5` (blue) |
| array | `#7c3aed` (purple) |
| string | `#10b981` (green) |
| number | `#f59e0b` (amber) |
| boolean | `#ec4899` (pink) |
| null | `#6b7280` (gray) |
