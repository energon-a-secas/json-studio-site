// ─────────────────────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────────────────────
import { $ } from './utils.js';
import { state } from './state.js';
import { getSortedRows } from './table.js';

function csvCell(val) {
  const s = (val === null || val === undefined) ? '' :
            (typeof val === 'object' ? JSON.stringify(val) : String(val));
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

export function exportCSV() {
  const { groups, columns, mode } = state.structure;
  const visibleCols = columns.filter(c => !state.hiddenCols.has(c.name));
  const isGrouped = mode === 'grouped';
  const tbody = $('table-body');

  const headers = (isGrouped ? ['Group'] : []).concat(visibleCols.map(c => c.name));
  const rows = [headers.join(',')];

  for (const group of groups) {
    for (const row of getSortedRows(group.rows)) {
      // Check if this row's tr is visible in the DOM
      const tr = [...tbody.querySelectorAll('.row-data')].find(
        t => t.dataset.group === (group.name || '') && t._rowData === row
      );
      if (tr && tr.classList.contains('hidden')) continue;
      const cells = (isGrouped ? [csvCell(group.name)] : [])
        .concat(visibleCols.map(c => csvCell(row[c.name])));
      rows.push(cells.join(','));
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'export.csv'; a.click();
  URL.revokeObjectURL(url);
}
