# JSON Studio — Engineer & UI Review + Roadmap

Review of the JSON Builder site (Builder, Viewer, Scrambler) as an engineer and as a web UI designer, plus a prioritized list of improvements.

---

## 1. Engineer review

### Viewer (Dynamic JSON View)

**Strengths**

- **Structure detection** (`table.js`): Handles flat arrays and grouped objects cleanly. Infers a shared array key across groups and falls back to first array property. Column typing (number / string / nested) is inferred from data.
- **Pivot detection** (`pivot.js`): Automatically detects grouped data with a “period → metrics” nested field (e.g. `history` or `allocation` with `12m`/`6m`/`3m`/`1m` and numeric metrics). Identifier field is chosen via heuristics (`name`, `user`, `username`, then first string column).
- **State** (`state.js`): Single mutable object; sort, hidden cols, heat map, column filters, pivot/timeline, regex search, and URL hash view state are all in one place. `resetViewerState()` keeps UI and state in sync.
- **Load flow** (`load.js`): Parse → detect structure → detect pivot → render table → build filter bar → switch to viewer. Session JSON and optional `#v=` hash state are applied correctly.
- **Table**: Sort (3-click cycle), column visibility dropdown, heat map and sparklines, nested badges opening modal with period pills. Row click opens record modal; keyboard (arrows + Enter) works when modal is closed.
- **Export**: CSV export and copy-row JSON. Filtering and visibility are respected.

**Improvement opportunities**

- **Pivot**: Only one pivot shape is supported (grouped + one nested “period → metrics” field). Supporting a second shape (e.g. flat rows with `project`, `person`, `period`, `value`) would require a different detection path and pivot table layout.
- **Large payloads**: Full re-render on every sort/filter. For 10k+ rows, consider virtualized table or pagination.
- **Errors**: Invalid JSON shows a single error line; no line/column in the message (could use `e.message` + regex or a second parser pass).

### Builder (Drag-and-drop structure)

**Strengths**

- **State**: Minimal — `root`, `nodeMap`, `idCounter`, `drag`, `editMode`. No redundant duplication; `nodeMap` gives O(1) lookup for drop targets and updates.
- **Rendering** (`render.js`): Recursive `renderNode()`; drop zones (empty and between siblings) are created in the same pass. Type badges and key/value inputs are consistent.
- **Drag**: Palette drag creates new node; canvas drag moves node. `dataTransfer` and `state.drag` distinguish source. Drop zones highlight on dragover.
- **Output**: Live JSON panel with syntax highlighting; Edit mode allows raw paste with Apply; Copy and Download are straightforward.

**Improvement opportunities**

- **Full re-render**: Every change calls `render()` and rebuilds the whole tree. For large structures, incremental DOM updates or virtualizing deep branches would help.
- **Validation**: No schema or “valid JSON” guarantee beyond parse; optional lint (e.g. duplicate keys, trailing commas) could live in the edit path.
- **No “Open in Viewer”**: Builder has no one-click “Send to Viewer”; user must copy JSON and open Viewer in another tab and paste. A “View dynamic” or “Open in Viewer” button would shorten the loop.

### Scrambler

- Single-file tool; does one job (scramble PII in JSON). Fits the “no build” philosophy.

---

## 2. UI / Designer review

### Viewer

**Strengths**

- Clear hierarchy: input card → load → example buttons; then toolbar (search, filters, pivot, columns, heat, sparklines, CSV) and table/sidebar.
- Pivot toolbar: “User” and “Metric” dropdowns + Table/Timeline toggle + period order. Label “User” fits both “person” and “user” semantics.
- Grouped table: Collapsible group rows with chevron and row count; alternating row background; nested cells show a badge and open a focused modal.
- Record modal: Clean key/value list; nested content gets period pills and metric table.
- Dark theme and tokens (`--bg`, `--accent`, `--text-muted`, etc.) are consistent with the rest of Neorgon.
- Accessibility: Skip link, `aria-modal` and `role="dialog"` on modal, keyboard navigation for rows.

**Improvement opportunities**

- **Example buttons**: All demos look the same (label + sub). A short description or icon per example (e.g. “People per project — pivot by person”) would help first-time users.
- **Pivot discoverability**: When pivot is available, a small hint (“Pivot by person/metric”) next to the Pivot button could increase usage.
- **Density**: No “compact” table mode; adding a density toggle (comfortable / compact) would help power users.
- **Mobile**: Toolbar wraps; table horizontal scroll is present but pivot table and timeline could use a more mobile-friendly layout (e.g. cards per project for pivot).

### Builder

**Strengths**

- Palette is scannable: type dot + label + mono hint. Root toggle (Object / Array) is clear.
- Canvas: Indentation and left-border color by depth; collapse toggles; drag handle on non-root nodes.
- JSON panel: View vs Edit with Apply and error message; actions (Copy, Download, Import) are visible.

**Improvement opportunities**

- **Drop affordance**: Empty canvas could show a short “Drag blocks here” or “Drop to add root” when dragging from palette.
- **Keyboard**: No keyboard shortcuts (e.g. Delete node, Expand/Collapse all, Copy node as JSON).
- **Examples**: No “Start from example” (e.g. “Empty object”, “Array of objects”, “API response shape”) in the Builder; adding 2–3 starter templates would align with the Viewer’s example-driven flow.

---

## 3. New example: People per project

A new Viewer demo, **“People per project”**, was added so you can:

1. **List people per project** — Data is grouped by project (e.g. Platform, Mobile, Data); each project has a `people` array with `name`, `email`, `role`, and `allocation`.
2. **Pivot by person** — Use **Pivot** → choose a person in the “User” dropdown and a metric (e.g. `hours` or `tasks`). The table (and timeline) show that person’s metric across projects.
3. **See user info** — Click any row to open the record modal and see full fields: name, email, role, and the nested `allocation` (with period pills and metric table).

So after loading “People per project”, you can both pivot to compare a person across projects and open any row to inspect that user’s details.

---

## 4. Prioritized roadmap

### P1 — JSON Dynamic View (Viewer)

- **Persistent “Open in Viewer” from Builder**: Button in Builder that serializes current tree to JSON, stores in `sessionStorage` (or hash), and navigates to `viewer/` so the Viewer opens with that JSON already loaded. Optionally support `viewer/#load=<base64>` or `?json=...` so the Builder can pass payload via URL.
- **View state in URL**: Already partially there (`#v=`). Consider adding “Share” (copy link with state + optional compressed JSON) so users can share a specific view.
- **Pivot UX**: When pivot is available, show a one-line hint: “Pivot by user and metric to see values across groups.” Consider defaulting to first user and first metric when entering pivot mode.

### P2 — Drag-and-drop structure (Builder)

- **Drop affordance**: When dragging from palette, show a clear “Drop here to create root” or “Drop on canvas to add” area (e.g. dashed border or placeholder).
- **Reorder within parent**: Ensure drag-between-siblings is obvious (e.g. line indicator between rows) and that drop on “empty” zone at end of list works.
- **Keyboard**: Delete node (with confirmation if it has children), Expand all / Collapse all, optional Copy node as JSON.
- **Undo/redo**: Single-level or multi-level undo for add/remove/edit/move would make the Builder safer for large structures.

### P3 — Examples and good-practice patterns

- **Viewer**: Add short tooltips or descriptions to example buttons (e.g. “People per project — pivot by person, see allocation across projects”). Optionally add one more “flat” example (e.g. “Events log”) for users who only have flat arrays.
- **Builder**: Add “Start from template” or “Examples” dropdown: e.g. “Empty object”, “Array of objects” (with 2–3 sample keys), “Grouped (projects → people)” so users can start from a pivot-friendly shape. Document in README that the Viewer expects either:
  - Flat: `[ { … }, … ]`
  - Grouped: `{ "GroupName": { "members"|"people"|"users": [ { … } ] } }`
  and that pivot requires a nested field of form `{ "12m": { metric1: number, … }, … }`.
- **Docs**: Add a “Good practice patterns” section (e.g. in README or `docs/patterns.md`) with 2–3 minimal JSON shapes: flat list, grouped list, and grouped + pivot-ready (with `name` + history/allocation). Link to these from the Viewer placeholder text or help.

### Further improvements (all sites under JSON Studio)

- **Viewer**: Column filters with “Select all / Clear” per column; export current view (filtered + sorted) as JSON, not only CSV; optional dark/light theme toggle.
- **Builder**: Optional “Validate” (e.g. JSON Schema or simple rules); “Open in Viewer” as in P1; optional localStorage autosave (with “Restore last” on load).
- **Scrambler**: Link from Viewer/Builder header (“Need to anonymize? Use Scrambler”); keep single-file.
- **Cross-linking**: Builder header already links to Viewer and Scrambler; Viewer links back to Builder and Scrambler. Add a small “Use this JSON in Builder” in the Viewer (e.g. when “Load JSON” is used) that pre-fills the Builder if opened in same session.
- **Performance**: For Viewer, virtualize table body for large datasets; for Builder, consider lazy-rendering deep branches or capping initial expand depth.

---

## 5. Summary

- **Engineer**: Viewer and Builder are well-structured, with clear state and separation of load, structure detection, pivot, table, and modal. The main gaps are scale (no virtualization), a single pivot shape, and no direct “Builder → Viewer” flow.
- **UI**: Layout and controls are clear; improvements are about discoverability (examples, pivot hint), density, and small UX wins (drop affordance, keyboard, templates).
- **New example**: “People per project” lets you list people per project, pivot by person to see metrics across projects, and open the record modal to see full user info.
- **Priority**: (1) JSON Dynamic View and “Open in Viewer”, (2) Drag-and-drop and keyboard in Builder, (3) Examples and good-practice patterns documented and surfaced in both apps.
