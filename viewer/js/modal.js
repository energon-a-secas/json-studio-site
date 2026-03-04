// ─────────────────────────────────────────────────────────────
// Nested Object Modal + Record Modal
// ─────────────────────────────────────────────────────────────
import { $, escHtml, fmt } from './utils.js';
import { state } from './state.js';

// ─────────────────────────────────────────────────────────────
// Nested Object Modal
// ─────────────────────────────────────────────────────────────
export function openNestedModal(tr, colName) {
  const { groups, columns } = state.structure;
  const stringCols = columns.filter(c => c.type === 'string');

  // Identifier from clicked row
  const tds = tr.querySelectorAll('td');
  const keyValues = {};
  columns.forEach((col, i) => {
    if (col.type === 'string') keyValues[col.name] = tds[i].dataset.raw;
  });

  // Visible groups (respects current search filter)
  const tbody = document.getElementById('table-body');
  const visibleGroups = new Set();
  for (const gr of tbody.querySelectorAll('.row-group')) {
    if (!gr.classList.contains('hidden')) visibleGroups.add(gr.dataset.group);
  }
  const useVisibility = visibleGroups.size > 0;

  // Collect matching rows
  const matchingRows = [];
  for (const group of groups) {
    if (useVisibility && !visibleGroups.has(group.name)) continue;
    for (const row of group.rows) {
      if (!stringCols.every(col => String(row[col.name] ?? '') === keyValues[col.name])) continue;
      const nested = row[colName];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        matchingRows.push({ groupName: group.name, nested });
      }
    }
  }
  if (matchingRows.length === 0) return;

  const isObjOfObjs = matchingRows.some(({ nested }) =>
    Object.values(nested).length > 0 &&
    Object.values(nested).every(v => v && typeof v === 'object' && !Array.isArray(v))
  );

  // Collect sorted periods + metrics (if obj-of-objs)
  let sortedPeriods = [], metricList = [];
  if (isObjOfObjs) {
    const allPeriods = new Set(), allMetrics = new Set();
    for (const { nested } of matchingRows) {
      for (const [period, metrics] of Object.entries(nested)) {
        allPeriods.add(period);
        if (metrics && typeof metrics === 'object') {
          for (const mk of Object.keys(metrics)) allMetrics.add(mk);
        }
      }
    }
    sortedPeriods = [...allPeriods].sort((a, b) => {
      const na = parseInt(a.match(/^(\d+)/)?.[1] ?? '0', 10);
      const nb = parseInt(b.match(/^(\d+)/)?.[1] ?? '0', 10);
      return na - nb;
    });
    metricList = [...allMetrics];
  }

  state.nestedModalState = { matchingRows, isObjOfObjs, sortedPeriods, metricList };

  const titleParts = stringCols.map(c => keyValues[c.name]).filter(Boolean);
  $('modal-title').textContent =
    (titleParts.join(' \u00B7 ') || 'Record') + ' \u2014 ' + colName;
  $('modal-footer').classList.add('hidden-el');
  document.querySelector('.modal-box').classList.add('modal-wide');

  renderNestedContent('all');
  $('record-modal').classList.remove('hidden-el');
}

export function renderNestedContent(activePeriod) {
  const { matchingRows, isObjOfObjs, sortedPeriods, metricList } = state.nestedModalState;
  let html = '';

  if (isObjOfObjs) {
    // ── Period filter pills ──
    html += `<div class="nested-filter-bar">`;
    html += `<button class="nested-filter-pill${activePeriod === 'all' ? ' active' : ''}" data-period="all">All periods</button>`;
    for (const p of sortedPeriods) {
      html += `<button class="nested-filter-pill${activePeriod === p ? ' active' : ''}" data-period="${escHtml(p)}">${escHtml(p)}</button>`;
    }
    html += `</div>`;

    if (activePeriod === 'all') {
      // Full table: Project | Period | metrics + totals row
      const grandTotals = Object.fromEntries(metricList.map(m => [m, 0]));
      html += `<table class="modal-table"><thead><tr>
        <th>Project</th><th>Period</th>
        ${metricList.map(m => `<th class="col-num">${escHtml(m)}</th>`).join('')}
      </tr></thead><tbody>`;

      for (const { groupName, nested } of matchingRows) {
        sortedPeriods.forEach((period, pi) => {
          const metrics = nested[period] || {};
          html += `<tr>
            <td class="${pi === 0 ? 'modal-project-cell' : 'modal-project-gap'}"
                style="${pi === 0 ? '' : 'border-top:none'}">${pi === 0 ? escHtml(groupName) : ''}</td>
            <td class="modal-period-cell">${escHtml(period)}</td>
            ${metricList.map(m => {
              const v = metrics[m];
              if (typeof v === 'number') grandTotals[m] += v;
              return `<td class="col-num">${typeof v === 'number' ? fmt(v) : (v !== undefined ? escHtml(String(v)) : '\u2014')}</td>`;
            }).join('')}
          </tr>`;
        });
      }
      html += `<tr class="nested-totals-row">
        <td>Total</td><td></td>
        ${metricList.map(m => `<td class="col-num">${fmt(grandTotals[m])}</td>`).join('')}
      </tr>`;
      html += `</tbody></table>`;

    } else {
      // Filtered table: Project | metrics for selected period
      const rowData = matchingRows.map(({ groupName, nested }) => {
        const metrics = nested[activePeriod] || {};
        const vals = Object.fromEntries(
          metricList.map(m => [m, typeof metrics[m] === 'number' ? metrics[m] : null])
        );
        return { groupName, vals };
      });

      const totals = Object.fromEntries(
        metricList.map(m => [m, rowData.reduce((s, r) => s + (r.vals[m] ?? 0), 0)])
      );

      html += `<table class="modal-table"><thead><tr>
        <th>Project</th>
        ${metricList.map(m => `<th class="col-num">${escHtml(m)}</th>`).join('')}
      </tr></thead><tbody>`;

      for (const { groupName, vals } of rowData) {
        html += `<tr>
          <td class="modal-project-cell">${escHtml(groupName)}</td>
          ${metricList.map(m => `<td class="col-num">${vals[m] !== null ? fmt(vals[m]) : '\u2014'}</td>`).join('')}
        </tr>`;
      }
      html += `<tr class="nested-totals-row">
        <td>Total</td>
        ${metricList.map(m => `<td class="col-num">${fmt(totals[m])}</td>`).join('')}
      </tr>`;
      html += `</tbody></table>`;

      // ── Distribution section ──
      const numericMetrics = metricList.filter(m => totals[m] !== 0);
      if (numericMetrics.length > 0) {
        html += `<div class="nested-summary"><div class="nested-summary-title">Distribution</div>`;
        for (const m of numericMetrics) {
          html += `<div class="nested-dist-row">
            <span class="nested-dist-metric">${escHtml(m)}</span>
            <span class="nested-dist-values">`;
          for (const { groupName, vals } of rowData) {
            if (vals[m] === null) continue;
            const pct = totals[m] > 0 ? (vals[m] / totals[m] * 100).toFixed(1) : '0.0';
            html += `<span class="nested-dist-chip">${escHtml(groupName)}<strong>${pct}%</strong></span>`;
          }
          html += `</span></div>`;
        }
        html += `</div>`;
      }
    }

  } else {
    // Plain object: Project | key1 | key2…
    const allKeys = new Set();
    for (const { nested } of matchingRows) for (const k of Object.keys(nested)) allKeys.add(k);
    const keyList = [...allKeys];
    html += `<table class="modal-table"><thead><tr>
      <th>Project</th>
      ${keyList.map(k => `<th>${escHtml(k)}</th>`).join('')}
    </tr></thead><tbody>`;
    for (const { groupName, nested } of matchingRows) {
      html += `<tr><td class="modal-project-cell">${escHtml(groupName)}</td>
        ${keyList.map(k => `<td>${nested[k] !== undefined ? escHtml(String(nested[k])) : '\u2014'}</td>`).join('')}
      </tr>`;
    }
    html += `</tbody></table>`;
  }

  $('modal-body').innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// Record Modal
// ─────────────────────────────────────────────────────────────
export function openRecordModal(tr) {
  const { groups, columns, mode } = state.structure;
  const stringCols = columns.filter(c => c.type === 'string');
  const numCols    = columns.filter(c => c.type === 'number');

  // Composite key: all string column values from the clicked row
  const tds = tr.querySelectorAll('td');
  const keyValues = {};
  columns.forEach((col, i) => {
    if (col.type === 'string') keyValues[col.name] = tds[i].dataset.raw;
  });

  // Find every row across all groups that shares the same string values
  const matches = [];
  for (const group of groups) {
    for (const row of group.rows) {
      if (stringCols.every(col => String(row[col.name] ?? '') === keyValues[col.name])) {
        matches.push({ groupName: group.name, row });
      }
    }
  }

  // Title
  const titleParts = stringCols.map(c => keyValues[c.name]).filter(Boolean);
  $('modal-title').textContent = titleParts.join(' \u00B7 ') || 'Record Detail';

  // Body
  let bodyHtml = '';
  if (mode === 'grouped') {
    bodyHtml += `<table class="modal-table"><thead><tr><th>Project</th>`;
    for (const col of numCols) bodyHtml += `<th class="col-num">${escHtml(col.name)}</th>`;
    bodyHtml += `</tr></thead><tbody>`;
    for (const { groupName, row } of matches) {
      bodyHtml += `<tr><td class="group-cell">${escHtml(groupName)}</td>`;
      for (const col of numCols) {
        const val = row[col.name];
        bodyHtml += `<td class="col-num">${val !== undefined && val !== null ? fmt(val) : '\u2014'}</td>`;
      }
      bodyHtml += `</tr>`;
    }
    bodyHtml += `</tbody></table>`;
  } else {
    // Flat mode: key-value detail view
    bodyHtml += `<table class="modal-table"><tbody>`;
    columns.forEach((col, i) => {
      bodyHtml += `<tr><td class="kv-key">${escHtml(col.name)}</td>` +
        `<td class="${col.type === 'number' ? 'col-num' : ''}">${escHtml(tds[i].dataset.raw) || '\u2014'}</td></tr>`;
    });
    bodyHtml += `</tbody></table>`;
  }
  $('modal-body').innerHTML = bodyHtml;

  // Footer: totals for numeric columns (grouped mode)
  const footer = $('modal-footer');
  if (mode === 'grouped' && numCols.length > 0) {
    let footerHtml = '';
    for (const col of numCols) {
      const vals = matches.map(m => m.row[col.name]).filter(v => typeof v === 'number');
      if (vals.length === 0) continue;
      const sum = vals.reduce((a, b) => a + b, 0);

      let indicator = '';
      const colLower = col.name.toLowerCase();
      if (colLower.includes('percent') || colLower.includes('%')) {
        const diff = Math.round((100 - sum) * 10) / 10;
        if (Math.abs(sum - 100) < 0.05) {
          indicator = ` <span class="pct-ok">\u2713 100%</span>`;
        } else if (sum < 100) {
          indicator = ` <span class="pct-low">needs ${diff} more</span>`;
        } else {
          indicator = ` <span class="pct-hi">over by ${Math.abs(diff)}</span>`;
        }
      }

      footerHtml += `<div class="modal-stat">
        <span class="modal-stat-label">${escHtml(col.name)}</span>
        <span class="modal-stat-value">${fmt(sum)}${indicator}</span>
      </div>`;
    }
    footer.innerHTML = footerHtml;
    footer.classList.toggle('hidden-el', !footerHtml);
  } else {
    footer.classList.add('hidden-el');
  }

  $('record-modal').classList.remove('hidden-el');
}

export function closeModal() {
  $('record-modal').classList.add('hidden-el');
  document.querySelector('.modal-box').classList.remove('modal-wide');
  state.nestedModalState = null;
}
