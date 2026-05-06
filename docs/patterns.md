# JSON Studio — Good practice patterns

Minimal JSON shapes that work well with the **JSON Visualizer** (table, filters, pivot). Use these as references when building or importing data.

---

## 1. Flat array of records

**Use for:** lists of items (orders, events, logs) where every row has the same fields.

```json
[
  { "id": "ORD-001", "customer": "Alice", "product": "Laptop", "qty": 1, "total": 1299.99 },
  { "id": "ORD-002", "customer": "Bob",   "product": "Mouse",  "qty": 3, "total": 89.97 }
]
```

- Visualizer shows a single table; no group headers.
- Sort, search, column filters, heat map, sparklines, and CSV export all work.

---

## 2. Grouped object (one array per group)

**Use for:** data grouped by category (e.g. by department, project, or region).

```json
{
  "Engineering": { "members": [
    { "name": "Sam", "role": "Backend", "tickets": 42 }
  ]},
  "Product": { "members": [
    { "name": "Nina", "role": "PM", "tickets": 21 }
  ]}
}
```

- Visualizer infers the array key from the first group (e.g. `members`). All groups must use the same key (or the first array property is used).
- Table shows collapsible group rows; you can sort and filter within the table.

---

## 3. Grouped + pivot-friendly (period → metrics)

**Use for:** when you want to **Pivot** by a person (or other identifier) and a numeric metric over time periods.

Each row must have:

- A **string identifier** field (e.g. `name`, `user`, `username`) — used as “User” in the Pivot toolbar.
- A **nested object** whose keys are period labels (e.g. `12m`, `6m`, `3m`, `1m`) and whose values are objects of numeric metrics (e.g. `hours`, `tasks`).

```json
{
  "Project A": {
    "people": [
      {
        "name": "Jordan",
        "role": "Lead",
        "allocation": {
          "12m": { "hours": 420, "tasks": 48 },
          "6m":  { "hours": 210, "tasks": 24 },
          "1m":  { "hours": 38,  "tasks": 4 }
        }
      }
    ]
  },
  "Project B": {
    "people": [
      {
        "name": "Jordan",
        "role": "Member",
        "allocation": {
          "12m": { "hours": 80, "tasks": 8 },
          "6m":  { "hours": 42, "tasks": 4 },
          "1m":  { "hours": 6,  "tasks": 1 }
        }
      }
    ]
  }
}
```

- Visualizer enables **Pivot**: choose a user and a metric; table (and timeline) show that user’s metric across groups (projects).
- Click any row to open the record modal and see full user info and nested allocation.

---

## Summary

| Shape              | Top-level   | Group key (if grouped) | Pivot |
|--------------------|------------|-------------------------|-------|
| Flat array         | `[ … ]`    | —                       | No    |
| Grouped            | `{ "K": { "members": [ … ] } }` | Same key in every group | No    |
| Grouped + pivot    | Same as grouped | Same key in every group | Yes (needs identifier + period→metrics field) |

In the **Builder**, use **Templates → Grouped (e.g. projects → people)** to start from a pivot-friendly shape, then edit keys and values. In the **Visualizer**, use **Try an example → People per project** to see pivot and record modal in action.
