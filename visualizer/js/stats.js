// ─────────────────────────────────────────────────────────────
// Stats Sidebar
// ─────────────────────────────────────────────────────────────
import { $, escHtml, fmt } from './utils.js';
import { state } from './state.js';

export function renderStats(lower, groupMatchCount) {
  const sidebar = $('stats-sidebar');
  const { groups, columns, mode } = state.structure;

  // Collect matched rows
  const matchedRows = [];
  for (const group of groups) {
    for (const row of group.rows) {
      if (!lower) {
        matchedRows.push(row);
      } else {
        const vals = Object.values(row).map(v =>
          (v !== null && v !== undefined) ? String(v).toLowerCase() : ''
        );
        if (vals.some(v => v.includes(lower))) matchedRows.push(row);
      }
    }
  }

  const numCols = columns.filter(c => c.type === 'number');
  let html = '';

  // Summary card
  const totalRows = groups.reduce((s, g) => s + g.rows.length, 0);
  html += `<div>
    <div class="stats-section-title">Summary</div>
    <div class="stats-card">
      <div class="stats-row">
        <span class="stats-label">Matching rows</span>
        <span class="stats-value">${matchedRows.length}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Total rows</span>
        <span class="stats-value">${totalRows}</span>
      </div>
    </div>
  </div>`;

  // Numeric column stats
  if (numCols.length > 0) {
    html += `<div><div class="stats-section-title">Numeric Columns</div>`;
    for (const col of numCols) {
      const vals = matchedRows
        .map(r => r[col.name])
        .filter(v => v !== null && v !== undefined && typeof v === 'number');
      if (vals.length === 0) continue;

      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const min = Math.min(...vals);
      const max = Math.max(...vals);

      html += `<div class="stats-card">
        <div class="stats-col-name">${escHtml(col.name)}</div>
        <div class="stats-row"><span class="stats-label">Sum</span><span class="stats-value">${fmt(sum)}</span></div>
        <div class="stats-row"><span class="stats-label">Avg</span><span class="stats-value">${fmt(avg)}</span></div>
        <div class="stats-row"><span class="stats-label">Min</span><span class="stats-value">${fmt(min)}</span></div>
        <div class="stats-row"><span class="stats-label">Max</span><span class="stats-value">${fmt(max)}</span></div>
        <div class="stats-row"><span class="stats-label">Count</span><span class="stats-value">${vals.length}</span></div>`;

      // 100% indicator for percentage columns
      const colLower = col.name.toLowerCase();
      if (colLower.includes('percent') || colLower.includes('%')) {
        const diff = Math.round((100 - sum) * 10) / 10;
        const rounded = Math.round(sum * 10) / 10;
        if (Math.abs(sum - 100) < 0.05) {
          html += `<div class="percent-indicator percent-ok">\u2713 Sums to 100%</div>`;
        } else if (sum < 100) {
          html += `<div class="percent-indicator percent-low">\u26A0 Needs ${diff} more (${rounded}%)</div>`;
        } else {
          html += `<div class="percent-indicator percent-hi">\u26A0 Over by ${Math.abs(diff)} (${rounded}%)</div>`;
        }
      }

      html += `</div>`;
    }
    html += `</div>`;
  }

  // Groups breakdown
  if (mode === 'grouped') {
    html += `<div><div class="stats-section-title">Groups</div><div class="stats-card"><div>`;
    for (const group of groups) {
      const count = lower ? (groupMatchCount[group.name] || 0) : group.rows.length;
      html += `<div class="group-stat-row">
        <span class="group-stat-name">${escHtml(group.name)}</span>
        <span class="group-stat-count">${count}</span>
      </div>`;
    }
    html += `</div></div></div>`;
  }

  sidebar.innerHTML = html;
}
