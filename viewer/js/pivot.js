// ─────────────────────────────────────────────────────────────
// Pivot Detection, Pivot UI, Pivot Table, Pivot Sidebar, Timeline
// ─────────────────────────────────────────────────────────────
import { $, escHtml, fmt } from './utils.js';
import { state } from './state.js';
import { applyFilter } from './filter.js';

// ─────────────────────────────────────────────────────────────
// Pivot Detection
// ─────────────────────────────────────────────────────────────
export function detectPivotConfig(parsed) {
  // Requires grouped mode
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const topKeys = Object.keys(parsed);
  if (topKeys.length === 0) return null;

  // Collect a sample of rows from all groups
  let sampleRows = [];
  for (const topKey of topKeys) {
    const val = parsed[topKey];
    if (!val || typeof val !== 'object' || Array.isArray(val)) return null;
    // Find the array within each group
    const arrayKey = Object.keys(val).find(k => Array.isArray(val[k]));
    if (!arrayKey) return null;
    for (const row of val[arrayKey]) {
      if (row && typeof row === 'object' && !Array.isArray(row)) sampleRows.push(row);
    }
  }
  if (sampleRows.length === 0) return null;

  // Find a pivot field: a field whose values are objects of objects (period → metrics)
  let pivotField = null;
  let periodKeys = null;
  let metrics = null;

  for (const fieldName of Object.keys(sampleRows[0])) {
    const vals = sampleRows.map(r => r[fieldName]).filter(v => v !== null && v !== undefined);
    if (vals.length === 0) continue;
    // Check if every non-null value is an object of objects
    const isObjOfObjs = vals.every(v =>
      v && typeof v === 'object' && !Array.isArray(v) &&
      Object.values(v).every(inner => inner && typeof inner === 'object' && !Array.isArray(inner))
    );
    if (!isObjOfObjs) continue;

    // Gather all period keys across all rows
    const allPeriods = new Set();
    for (const v of vals) for (const p of Object.keys(v)) allPeriods.add(p);
    if (allPeriods.size === 0) continue;

    // Gather numeric metric keys from sub-objects
    const numericMetrics = new Set();
    for (const v of vals) {
      for (const periodObj of Object.values(v)) {
        for (const [mk, mv] of Object.entries(periodObj)) {
          if (typeof mv === 'number') numericMetrics.add(mk);
        }
      }
    }
    if (numericMetrics.size === 0) continue;

    pivotField = fieldName;
    // Sort period keys by numeric prefix
    periodKeys = [...allPeriods].sort((a, b) => {
      const na = parseInt(a.match(/^(\d+)/)?.[1] ?? '0', 10);
      const nb = parseInt(b.match(/^(\d+)/)?.[1] ?? '0', 10);
      return na - nb;
    });
    metrics = [...numericMetrics];
    break;
  }

  if (!pivotField) return null;

  // Find an identifier field by name heuristic
  const nameHeuristics = ['name', 'user', 'username'];
  let identifierField = null;
  for (const h of nameHeuristics) {
    if (sampleRows[0] && h in sampleRows[0] && typeof sampleRows[0][h] === 'string') {
      identifierField = h;
      break;
    }
  }
  if (!identifierField) {
    // Fall back to first string column
    for (const key of Object.keys(sampleRows[0] || {})) {
      if (typeof sampleRows[0][key] === 'string') { identifierField = key; break; }
    }
  }
  if (!identifierField) return null;

  return { identifierField, pivotField, periodKeys, metrics };
}

// ─────────────────────────────────────────────────────────────
// Pivot UI
// ─────────────────────────────────────────────────────────────
export function renderPivotToolbar(pivotConfig) {
  const { identifierField, metrics } = pivotConfig;
  const { groups } = state.structure;

  // Collect all user values across all groups
  const userSet = new Set();
  for (const group of groups) {
    for (const row of group.rows) {
      if (row[identifierField] !== undefined && row[identifierField] !== null) {
        userSet.add(String(row[identifierField]));
      }
    }
  }
  const users = [...userSet].sort((a, b) => a.localeCompare(b));

  const userSel = $('pivot-user-select');
  userSel.innerHTML = users.map(u => `<option value="${escHtml(u)}">${escHtml(u)}</option>`).join('');

  const metricSel = $('pivot-metric-select');
  metricSel.innerHTML = metrics.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');
}

export function renderPivotTable(structure, pivotConfig, user, metric) {
  const { groups } = structure;
  const { identifierField, pivotField, periodKeys } = pivotConfig;

  // Build pivot data: only groups where user appears
  const pivotRows = [];
  for (const group of groups) {
    const matchingRow = group.rows.find(r => String(r[identifierField] ?? '') === user);
    if (!matchingRow) continue;
    const histObj = matchingRow[pivotField] || {};
    const vals = periodKeys.map(p => {
      const inner = histObj[p];
      return (inner && typeof inner === 'object' && typeof inner[metric] === 'number')
        ? inner[metric] : null;
    });
    const total = vals.reduce((s, v) => s + (v ?? 0), 0);
    pivotRows.push({ groupName: group.name, vals, total });
  }

  // Thead
  const thead = $('pivot-table-head');
  thead.innerHTML = '';
  const hrow = document.createElement('tr');
  hrow.innerHTML = `<th>Project</th>` +
    periodKeys.map(p => `<th class="col-num">${escHtml(p)}</th>`).join('') +
    `<th class="col-num">Total</th>`;
  thead.appendChild(hrow);

  // Tbody + totals
  const tbody = $('pivot-table-body');
  tbody.innerHTML = '';

  const colTotals = new Array(periodKeys.length).fill(0);
  let grandTotal = 0;

  for (const { groupName, vals, total } of pivotRows) {
    const tr = document.createElement('tr');
    let cells = `<td>${escHtml(groupName)}</td>`;
    vals.forEach((v, i) => {
      if (v !== null) {
        colTotals[i] += v;
        cells += `<td class="col-num">${fmt(v)}</td>`;
      } else {
        cells += `<td class="col-missing">\u2014</td>`;
      }
    });
    grandTotal += total;
    cells += `<td class="col-total">${fmt(total)}</td>`;
    tr.innerHTML = cells;
    tbody.appendChild(tr);
  }

  // Totals row
  const totalsRow = document.createElement('tr');
  totalsRow.className = 'pivot-totals-row';
  let totalsCells = `<td>Totals</td>`;
  colTotals.forEach(v => { totalsCells += `<td class="col-num">${fmt(v)}</td>`; });
  totalsCells += `<td class="col-total">${fmt(grandTotal)}</td>`;
  totalsRow.innerHTML = totalsCells;
  tbody.appendChild(totalsRow);

  return { pivotRows, colTotals, grandTotal };
}

export function renderPivotSidebar(pivotData, pivotConfig) {
  const { pivotRows, colTotals, grandTotal } = pivotData;
  const { periodKeys } = pivotConfig;
  const sidebar = $('stats-sidebar');

  let html = `<div>
    <div class="stats-section-title">Pivot Summary</div>
    <div class="stats-card">
      <div class="stats-row">
        <span class="stats-label">Grand total</span>
        <span class="stats-value">${fmt(grandTotal)}</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">Projects with user</span>
        <span class="stats-value">${pivotRows.length}</span>
      </div>
    </div>
  </div>`;

  html += `<div><div class="stats-section-title">Period Totals</div><div class="stats-card">`;
  periodKeys.forEach((p, i) => {
    html += `<div class="stats-row">
      <span class="stats-label">${escHtml(p)}</span>
      <span class="stats-value">${fmt(colTotals[i])}</span>
    </div>`;
  });
  html += `</div></div>`;

  sidebar.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// Timeline Chart
// ─────────────────────────────────────────────────────────────
export const CHART_COLORS = ['#818cf8','#34d399','#fbbf24','#f472b6','#2dd4bf','#fb923c','#a78bfa','#60a5fa','#f87171','#4ade80'];

export function renderTimelineChart(structure, pivotConfig, user, metric) {
  const area = $('timeline-area');
  const sidebar = $('stats-sidebar');
  const { groups } = structure;
  const { identifierField, pivotField, periodKeys: rawPeriodKeys } = pivotConfig;
  const periodKeys = state.periodReversed ? [...rawPeriodKeys].reverse() : rawPeriodKeys;

  // Update button label to reflect current order
  const orderLabel = $('btn-period-order-label');
  if (orderLabel) {
    orderLabel.textContent = `${periodKeys[0]} \u2192 ${periodKeys[periodKeys.length - 1]}`;
  }

  // Collect data: one series per group where user appears
  const series = [];
  for (const group of groups) {
    const matchRow = group.rows.find(r => String(r[identifierField] ?? '') === user);
    if (!matchRow) continue;
    const histObj = matchRow[pivotField] || {};
    const vals = periodKeys.map(p => {
      const v = (histObj[p] || {})[metric];
      return (v !== undefined && v !== null && !isNaN(Number(v))) ? Number(v) : null;
    });
    if (vals.every(v => v === null)) continue;
    series.push({ name: group.name, vals });
  }

  if (series.length === 0) {
    area.innerHTML = `<div style="color:var(--text-muted);padding:32px;text-align:center;">No data found for <strong style="color:var(--text-primary)">${escHtml(user)}</strong> in any project.</div>`;
    sidebar.innerHTML = '';
    return;
  }

  // Chart geometry
  const W = 700, H = 280;
  const PAD = { top: 20, right: 24, bottom: 40, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const xStep  = periodKeys.length > 1 ? chartW / (periodKeys.length - 1) : chartW / 2;

  // Y scale
  const allVals = series.flatMap(s => s.vals).filter(v => v !== null);
  const yMin = 0;
  const yMax = Math.max(...allVals) * 1.15 || 10;

  function xPos(i) {
    return PAD.left + (periodKeys.length > 1 ? i * xStep : chartW / 2);
  }
  function yPos(v) {
    return PAD.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
  }

  // Y grid lines (4 lines)
  let gridLines = '';
  let yLabels   = '';
  for (let t = 0; t <= 4; t++) {
    const val = yMin + (yMax - yMin) * (t / 4);
    const y   = yPos(val);
    gridLines += `<line class="timeline-grid" x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}"/>`;
    yLabels   += `<text class="timeline-axis-label" x="${PAD.left - 8}" y="${y + 4}" text-anchor="end">${fmt(val)}</text>`;
  }

  // X axis labels
  let xLabels = '';
  periodKeys.forEach((p, i) => {
    xLabels += `<text class="timeline-axis-label" x="${xPos(i)}" y="${H - PAD.bottom + 18}" text-anchor="middle">${escHtml(p)}</text>`;
  });

  // Lines + dots per series
  let linesHtml = '';
  let dotsHtml  = '';
  series.forEach((s, si) => {
    const color = CHART_COLORS[si % CHART_COLORS.length];
    // Build path (skip nulls with M/L segments)
    let d = '';
    let prev = null;
    s.vals.forEach((v, i) => {
      if (v === null) { prev = null; return; }
      const x = xPos(i), y = yPos(v);
      d += prev === null ? `M ${x} ${y}` : ` L ${x} ${y}`;
      prev = { x, y };
    });
    if (d) linesHtml += `<path class="timeline-line" d="${d}" stroke="${color}"/>`;
    s.vals.forEach((v, i) => {
      if (v === null) return;
      const x = xPos(i), y = yPos(v);
      dotsHtml += `<circle class="timeline-dot" cx="${x}" cy="${y}" fill="${color}"
        data-series="${escHtml(s.name)}" data-period="${escHtml(periodKeys[i])}" data-value="${v}"/>`;
    });
  });

  // Legend
  const legendHtml = series.map((s, si) => {
    const color = CHART_COLORS[si % CHART_COLORS.length];
    return `<div class="timeline-legend-item">
      <div class="timeline-legend-dot" style="background:${color}"></div>
      <span>${escHtml(s.name)}</span>
    </div>`;
  }).join('');

  area.innerHTML = `
    <div class="timeline-chart-wrap">
      <div class="timeline-chart-title">${escHtml(user)} \u00B7 ${escHtml(metric)} over time</div>
      <svg class="timeline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${gridLines}${yLabels}${xLabels}${linesHtml}${dotsHtml}
      </svg>
      <div class="timeline-legend">${legendHtml}</div>
    </div>`;

  // Sidebar: per-period totals across all series
  const colTotals = periodKeys.map((_, i) => {
    const nums = series.map(s => s.vals[i]).filter(v => v !== null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
  });
  const grandTotal = colTotals.filter(v => v !== null).reduce((a, b) => a + b, 0);

  let sbHtml = `<div class="sidebar-section">
    <div class="sidebar-section-title">Timeline Summary</div>
    <div class="stats-row"><span class="stats-label">Projects tracked</span><span class="stats-value">${series.length}</span></div>
    <div class="stats-row"><span class="stats-label">Grand total</span><span class="stats-value">${fmt(grandTotal)}</span></div>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-section-title">By Period</div>
    ${periodKeys.map((p, i) => `<div class="stats-row"><span class="stats-label">${escHtml(p)}</span><span class="stats-value">${colTotals[i] !== null ? fmt(colTotals[i]) : '\u2014'}</span></div>`).join('')}
  </div>`;
  sidebar.innerHTML = sbHtml;
}

// ─────────────────────────────────────────────────────────────
// Pivot mode activation / deactivation / refresh
// ─────────────────────────────────────────────────────────────
export function activatePivotMode() {
  state.pivotActive = true;
  state.timelineMode = false;
  $('btn-pivot').classList.add('active');
  $('pivot-toolbar').classList.remove('hidden-el');
  $('search-bar').style.display = 'none';
  $('data-table').classList.add('hidden-el');
  $('pivot-table').classList.remove('hidden-el');
  $('timeline-area').classList.add('hidden-el');
  $('btn-chart-toggle').classList.remove('active');
  refreshPivot();
}

export function deactivatePivotMode() {
  state.pivotActive = false;
  state.timelineMode = false;
  state.periodReversed = false;
  $('btn-pivot').classList.remove('active');
  $('pivot-toolbar').classList.add('hidden-el');
  $('search-bar').style.display = '';
  $('data-table').classList.remove('hidden-el');
  $('pivot-table').classList.add('hidden-el');
  $('timeline-area').classList.add('hidden-el');
  $('btn-chart-toggle').classList.remove('active');
  $('btn-period-order').classList.add('hidden-el');
  applyFilter($('search-input').value);
}

export function refreshPivot() {
  if (!state.pivotActive || !state.pivotConfig) return;
  const user   = $('pivot-user-select').value;
  const metric = $('pivot-metric-select').value;
  if (state.timelineMode) {
    $('pivot-table').classList.add('hidden-el');
    $('timeline-area').classList.remove('hidden-el');
    renderTimelineChart(state.structure, state.pivotConfig, user, metric);
  } else {
    $('timeline-area').classList.add('hidden-el');
    $('pivot-table').classList.remove('hidden-el');
    const pivotData = renderPivotTable(state.structure, state.pivotConfig, user, metric);
    renderPivotSidebar(pivotData, state.pivotConfig);
  }
}
