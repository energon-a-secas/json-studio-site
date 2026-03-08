# JSON Visualizer

A zero-dependency JSON explorer. Open `index.html` directly in any browser — no server or build step required.

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
- **Grouped mode** — rows become projects, columns become the numeric fields. Useful for seeing how one person's numbers are distributed across all projects. The footer shows totals with the same 100% indicator.
- **Flat mode** — shows a key/value detail card for the single record.

Dismiss with the × button, a click outside the modal, or Escape.

### File input
- Paste JSON directly into the textarea.
- Drag and drop a `.json` file onto the textarea.
- Use the "Upload File" button to pick a file.

## Column type inference

The visualizer infers each column's type at load time:

- **number** — every non-null value across all groups is a JS `number`.
- **string** — anything else (mixed types, strings, booleans, nulls).

Numeric columns are right-aligned and use a monospace font. Only numeric columns appear in the stats sidebar and in the modal's comparison table.

## 100% indicator detection

The indicator is triggered when a column name (case-insensitive) contains the word `percent` or the character `%`. Column names like `ratio`, `weight`, or `share` do not trigger it even if they represent percentages.

## Limitations

- **Root must be an array or a plain object.** Primitives, `null`, and nested arrays at the root are rejected.
- **Grouped mode assumes one level of nesting.** Deeper nesting (groups of groups) is not supported.
- **All groups must share the same array key.** The key is detected from the first group and applied to all others. Groups with a different structure may produce empty rows.
- **Column union across all groups.** If groups have different fields, all field names appear as columns; cells with no value for a column show as empty.
- **No sorting by column.** Clicking a column header does not sort the table.
- **Search matches raw string values only.** Numeric values are matched as strings (e.g. searching `"78"` matches a cell with value `78`), but the search does not support numeric range queries.
- **Row identity in the modal is based on string column values.** Two rows are considered the same record if every string-type column has an identical value. If all columns are numeric there is no string key to match on, so the modal will surface every row from every group.
- **No pagination.** Very large datasets (thousands of rows) may make the browser sluggish.
- **Local only.** No data leaves the browser; everything runs client-side.
