// ─────────────────────────────────────────────────────────────
// Structure Detection, Sorting, Table Rendering, Heat Map, Highlight
// ─────────────────────────────────────────────────────────────
import { $, escHtml, fmt } from './utils.js';
import { state, pushViewState } from './state.js';

// ─────────────────────────────────────────────────────────────
// Structure Detection
// ─────────────────────────────────────────────────────────────
export function detectStructure(parsed) {
  let groups = [];
  let mode;

  if (Array.isArray(parsed)) {
    mode = 'flat';
    groups = [{ name: null, rows: parsed.filter(r => r && typeof r === 'object' && !Array.isArray(r)) }];
  } else if (parsed && typeof parsed === 'object') {
    mode = 'grouped';
    const topKeys = Object.keys(parsed);

    // Find the shared array key from the first group
    let arrayKey = null;
    for (const k of topKeys) {
      const val = parsed[k];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        arrayKey = Object.keys(val).find(ik => Array.isArray(val[ik])) || null;
        if (arrayKey) break;
      }
    }

    for (const k of topKeys) {
      const val = parsed[k];
      let rows = [];
      if (Array.isArray(val)) {
        rows = val.filter(r => r && typeof r === 'object' && !Array.isArray(r));
      } else if (val && typeof val === 'object') {
        if (arrayKey && Array.isArray(val[arrayKey])) {
          rows = val[arrayKey].filter(r => r && typeof r === 'object' && !Array.isArray(r));
        } else {
          // Fallback: first array property
          const firstArr = Object.values(val).find(v => Array.isArray(v));
          rows = firstArr ? firstArr.filter(r => r && typeof r === 'object' && !Array.isArray(r)) : [];
        }
      }
      groups.push({ name: k, rows });
    }
  } else {
    throw new Error('JSON must start with [ ] or { } at the top level.');
  }

  // Collect columns: union of all field names across all rows
  const fieldSet = new Set();
  for (const g of groups) {
    for (const row of g.rows) {
      for (const k of Object.keys(row)) fieldSet.add(k);
    }
  }

  // Infer type: 'number', 'nested' (object), or 'string'
  const columns = [];
  for (const name of fieldSet) {
    let isNum = true;
    let isNested = false;
    for (const g of groups) {
      for (const row of g.rows) {
        const v = row[name];
        if (v !== null && v !== undefined) {
          if (typeof v === 'object' && !Array.isArray(v)) isNested = true;
          if (typeof v !== 'number') isNum = false;
        }
      }
    }
    columns.push({ name, type: isNested ? 'nested' : (isNum ? 'number' : 'string') });
  }

  return { mode, groups, columns };
}

// ─────────────────────────────────────────────────────────────
// Sorting
// ─────────────────────────────────────────────────────────────
export function getSortedRows(rows) {
  if (!state.sortCol) return rows;
  return [...rows].sort((a, b) => {
    const av = a[state.sortCol] ?? '';
    const bv = b[state.sortCol] ?? '';
    let cmp;
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv;
    } else {
      cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    }
    return state.sortDir === 'asc' ? cmp : -cmp;
  });
}

// ─────────────────────────────────────────────────────────────
// Rerender helper
// Requires initRerender() to be called from app.js before use
// ─────────────────────────────────────────────────────────────
let _eventsMod = null;

// Called by app.js after all modules are loaded
export function initRerender(eventsMod) {
  _eventsMod = eventsMod;
}

export function rerender() {
  if (!state.structure) return;
  renderTable(state.structure);
  if (_eventsMod) {
    _eventsMod.applyFilter($('search-input').value);
    _eventsMod.applyColFilters();
  }
  if (state.heatMapEnabled) applyHeatMap();
}

// ─────────────────────────────────────────────────────────────
// Table Rendering
// ─────────────────────────────────────────────────────────────
export function renderTable(structure) {
  const { groups, columns, mode } = structure;
  const isGrouped = mode === 'grouped';

  // thead — with sort indicators
  const thead = $('table-head');
  thead.innerHTML = '';
  const visibleCols = columns.filter(c => !state.hiddenCols.has(c.name));

  // Pre-compute column ranges for sparklines
  const colRanges = {};
  if (state.sparklinesEnabled) {
    for (const col of visibleCols.filter(c => c.type === 'number')) {
      const vals = groups.flatMap(g => g.rows).map(r => r[col.name]).filter(v => typeof v === 'number');
      colRanges[col.name] = { min: Math.min(...vals), max: Math.max(...vals) };
    }
  }

  const hrow = document.createElement('tr');
  for (const col of visibleCols) {
    const th = document.createElement('th');
    if (col.type === 'number') th.classList.add('col-num');
    if (col.type !== 'nested') {
      th.classList.add('sortable');
      const isActive = state.sortCol === col.name;
      th.innerHTML = `${escHtml(col.name)}<i class="sort-icon">${isActive ? (state.sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u21C5'}</i>`;
      if (isActive) th.classList.add(state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      th.addEventListener('click', () => {
        if (state.sortCol === col.name) {
          state.sortClicks++;
          if (state.sortClicks === 1) { state.sortDir = 'desc'; }
          else { state.sortCol = null; state.sortClicks = 0; }
        } else {
          state.sortCol = col.name; state.sortDir = 'asc'; state.sortClicks = 0;
        }
        rerender();
        pushViewState();
      });
    } else {
      th.textContent = col.name;
    }
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);

  // tbody
  const tbody = $('table-body');
  tbody.innerHTML = ''; // clears keyboard-focused state naturally
  let rowIdx = 0;

  for (const group of groups) {
    // Group header row
    if (isGrouped && group.name !== null) {
      const groupRow = document.createElement('tr');
      groupRow.className = 'row-group';
      groupRow.dataset.group = group.name;
      groupRow.dataset.originalIndex = rowIdx++;

      const td = document.createElement('td');
      td.colSpan = visibleCols.length;
      td.innerHTML =
        `<div class="group-name">` +
        `<svg class="group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>` +
        `<span>${escHtml(group.name)}</span>` +
        `<span class="group-badge" data-total="${group.rows.length}">${group.rows.length} rows</span>` +
        `</div>`;
      groupRow.appendChild(td);
      tbody.appendChild(groupRow);

      groupRow.addEventListener('click', () => {
        const isCollapsed = groupRow.classList.toggle('collapsed');
        groupRow.querySelector('.group-chevron').classList.toggle('collapsed', isCollapsed);
        const dataRows = tbody.querySelectorAll(`.row-data[data-group="${CSS.escape(group.name)}"]`);
        for (const r of dataRows) {
          if (isCollapsed) {
            r.dataset.collapsedByGroup = '1';
            r.classList.add('hidden');
          } else {
            delete r.dataset.collapsedByGroup;
            r.classList.remove('hidden');
          }
        }
      });
    }

    // Data rows (sorted copy — never mutates original)
    for (const row of getSortedRows(group.rows)) {
      const tr = document.createElement('tr');
      tr.className = 'row-data';
      tr.dataset.originalIndex = rowIdx++;
      tr._rowData = row; // for CSV export + copy-row
      if (isGrouped && group.name !== null) tr.dataset.group = group.name;

      for (const col of visibleCols) {
        const td = document.createElement('td');
        const val = row[col.name];
        if (col.type === 'nested' && val && typeof val === 'object') {
          td.dataset.raw = '';
          td.dataset.nestedCol = col.name;
          td.dataset.nestedJson = JSON.stringify(val);
          const badge = document.createElement('button');
          badge.className = 'nested-badge';
          badge.innerHTML =
            `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>` +
            escHtml(col.name);
          td.appendChild(badge);
        } else {
          if (col.type === 'number') td.classList.add('col-num');
          const raw = (val !== undefined && val !== null) ? String(val) : '';
          td.dataset.raw = raw;
          if (col.type === 'number' && state.sparklinesEnabled && colRanges[col.name] && raw !== '') {
            const { min, max } = colRanges[col.name];
            const t = max > min ? (Number(val) - min) / (max - min) : 1;
            const pct = Math.round(t * 100);
            td.innerHTML = `<div class="spark-wrap"><span>${escHtml(raw)}</span><div class="spark-track"><div class="spark-fill" style="width:${pct}%"></div></div></div>`;
          } else {
            td.textContent = raw;
          }
        }
        tr.appendChild(td);
      }
      // Copy-row button in last td
      if (tr.lastChild) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-row-btn';
        copyBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
        tr.lastChild.appendChild(copyBtn);
      }
      tbody.appendChild(tr);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Highlight
// ─────────────────────────────────────────────────────────────
export function highlightText(text, term) {
  if (!term || !text) return escHtml(text);
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let result = '';
  let idx = 0;
  while (idx < text.length) {
    const found = lowerText.indexOf(lowerTerm, idx);
    if (found === -1) { result += escHtml(text.slice(idx)); break; }
    result += escHtml(text.slice(idx, found));
    result += `<mark>${escHtml(text.slice(found, found + term.length))}</mark>`;
    idx = found + term.length;
  }
  return result;
}

export function highlightRegex(text, re) {
  if (!text) return '';
  let result = '', lastIndex = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    result += escHtml(text.slice(lastIndex, m.index));
    result += `<mark>${escHtml(m[0])}</mark>`;
    lastIndex = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++; // prevent infinite loop on zero-width match
  }
  return result + escHtml(text.slice(lastIndex));
}

// ─────────────────────────────────────────────────────────────
// Heat Map
// ─────────────────────────────────────────────────────────────
export function applyHeatMap() {
  if (!state.structure) return;
  const { columns, groups } = state.structure;
  const numCols = columns.filter(c => c.type === 'number' && !state.hiddenCols.has(c.name));
  const visibleCols = columns.filter(c => !state.hiddenCols.has(c.name));

  // Compute min/max per numeric column from all rows
  const colStats = {};
  for (const col of numCols) {
    const vals = groups.flatMap(g => g.rows).map(r => r[col.name]).filter(v => typeof v === 'number');
    colStats[col.name] = { min: Math.min(...vals), max: Math.max(...vals) };
  }

  const tbody = $('table-body');
  for (const tr of tbody.querySelectorAll('.row-data')) {
    const tds = tr.querySelectorAll('td');
    visibleCols.forEach((col, i) => {
      if (col.type !== 'number') return;
      const td = tds[i];
      if (!td) return;
      const raw = parseFloat(td.dataset.raw);
      const { min, max } = colStats[col.name] || {};
      if (max === min || isNaN(raw)) { td.classList.remove('heat-cell'); return; }
      const t = (raw - min) / (max - min);
      // Cool (blue-ish) → warm (red-ish)
      const r = Math.round(t * 220 + (1 - t) * 30);
      const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 80);
      const b = Math.round((1 - t) * 200 + t * 40);
      td.classList.add('heat-cell');
      td.style.backgroundColor = `rgba(${r},${g},${b},${0.12 + t * 0.28})`;
    });
  }
}

export function clearHeatMap() {
  for (const td of document.querySelectorAll('td.heat-cell')) {
    td.classList.remove('heat-cell');
    td.style.backgroundColor = '';
  }
}
