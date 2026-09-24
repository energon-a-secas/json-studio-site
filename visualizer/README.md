# JSON Visualizer

A zero-dependency JSON explorer. Open `index.html` directly in any browser. No server or build step required.

## What it does

Paste or upload a JSON file and the visualizer auto-detects its shape, renders the records as a searchable table, and shows live aggregate stats in a sidebar.

## Supported JSON shapes

### Flat array
```json
[
  { "name": "Alice", "tickets": 42, "allocation": 35.0 },
  { "name": "Bob",   "tickets": 18, "allocation": 65.0 }
]
```
Renders as a single flat table with no group headers.

### Grouped object
```json
{
  "PROJECT_A": {
    "users": [
      { "name": "Alice", "tickets": 42, "dynamic_percentage": 35.0 }
    ]
  },
  "PROJECT_B": {
    "users": [
      { "name": "Alice", "tickets": 90, "dynamic_percentage": 22.6 }
    ]
  }
}
```
Each top-level key becomes a collapsible group. The visualizer finds the first array-valued property inside each group and uses its items as rows. All groups are expected to share the same array key (detected from the first group).

## Features

### Search
- Live, debounced (150 ms), case-insensitive across all cell values.
- Matching rows are highlighted; non-matching rows are hidden.
- Groups with at least one match float to the top of the table.
- The match count is shown next to the search box.

### Stats sidebar
Shows aggregates for the **currently filtered** records:
- Per numeric column: Sum, Avg, Min, Max, Count.
- **100% indicator** for any column whose name contains `percent` or `%`: shows a green ✓ if the sum rounds to 100, amber if below, red if above.
- Groups breakdown: match count per group.

### Row detail modal
Click any data row to open a popup showing that record from the opposite perspective:
- **Grouped mode**: rows become projects, columns become the numeric fields. Useful for seeing how one person's numbers are distributed across all projects. The footer shows totals with the same 100% indicator.
- **Flat mode**: shows a key/value detail card for the single record.

Dismiss with the × button, a click outside the modal, or Escape.

### File input
- Paste JSON directly into the textarea.
- Drag and drop a `.json` file onto the textarea.
- Use the "Upload File" button to pick a file.

## Embedding

`embed.html` is the viewer with no header, no input screen and no analytics, made to sit in an iframe on another site. The host page hands it the data with one `postMessage` call, so the data never appears in a URL, is never stored, and never leaves the host page: the embed's Content Security Policy lets it request nothing but its own files, which anyone can verify from the page source. [embed-builder.html](embed-builder.html) configures one, shows it live, and writes the snippet.

The handshake:

1. The embed posts `{ source: 'jsonstudio', type: 'ready' }` to its parent.
2. The host posts `{ type: 'jsonstudio:load', data }` back, with `https://jsonstudio.neorgon.com` as the target origin. `data` is an object, an array or a JSON string. Posting again replaces the data in place.
3. The embed answers `loaded`: mode, row count, group names, columns with their types, and whether the data can pivot.

Presentation comes from the URL: `view=table|pivot|tree`, `title`, `toolbar=off`, `stats=off`, `hide=col,col`, `sort=col:desc`, `pivot=user,metric`, `chart=timeline`, `fit=content` (grow with the data and post `height`), `bg=hex`. Commands after load: `jsonstudio:view`, `jsonstudio:search`, `jsonstudio:sort`, `jsonstudio:columns`, `jsonstudio:pivot`, `jsonstudio:state`; each is answered with a `state` message. A row click posts `row`. The whole contract is written out at the bottom of the builder page and at the top of `js/embed.js`.

Anyone may embed it. GitHub Pages cannot restrict framing, and for a public tool that is the point.

## Security & Data Privacy

**Your JSON is processed in your browser and never uploaded.** There is no server behind this page.

- The data never leaves the page: no request carries it, and the Content Security Policy allows connections only to this origin and the two analytics hosts below.
- Analytics: on `*.neorgon.com` the shared header kit loads GoatCounter and Cloudflare Web Analytics for pageview counts. They see the URL, not the data; they are skipped for visitors sending Do Not Track or Global Privacy Control; they never load on a local copy. `embed.html` loads neither: its policy names no host at all.
- Storage: the page keeps a copy of the loaded JSON in `sessionStorage` (cleared when the tab closes) so a refresh keeps your data, and the search, sort and hidden columns in the URL hash so a view can be shared. The embed does neither.
- No cookies of its own. The `neo_theme` cookie exists only if you pick a theme.

Safe for confidential data. Usable offline once the page is loaded.

## Column type inference

The visualizer infers each column's type at load time:

- **number**: every non-null value across all groups is a JS `number`.
- **string**: anything else (mixed types, strings, booleans, nulls).

Numeric columns are right-aligned and use a monospace font. Only numeric columns appear in the stats sidebar and in the modal's comparison table.

## 100% indicator detection

The indicator is triggered when a column name (case-insensitive) contains the word `percent` or the character `%`. Column names like `ratio`, `weight`, or `share` do not trigger it even if they represent percentages.

## Limitations

- **Root must be an array or a plain object.** Primitives, `null`, and nested arrays at the root are rejected.
- **Grouped mode assumes one level of nesting.** Deeper nesting (groups of groups) is not supported.
- **All groups must share the same array key.** The key is detected from the first group and applied to all others. Groups with a different structure may produce empty rows.
- **Column union across all groups.** If groups have different fields, all field names appear as columns; cells with no value for a column show as empty.
- **Search matches raw string values only.** Numeric values are matched as strings (e.g. searching `"78"` matches a cell with value `78`), but the search does not support numeric range queries.
- **Row identity in the modal is based on string column values.** Two rows are considered the same record if every string-type column has an identical value. If all columns are numeric there is no string key to match on, so the modal will surface every row from every group.
- **No pagination.** Very large datasets (thousands of rows) may make the browser sluggish.
