// ─────────────────────────────────────────────────────────────
// Search/Filter, Column Filters, Column Visibility
// ─────────────────────────────────────────────────────────────
import { $, escHtml } from './utils.js';
import { state } from './state.js';
import { highlightText, highlightRegex, rerender } from './table.js';
import { renderStats } from './stats.js';

// ─────────────────────────────────────────────────────────────
// Filter
// ─────────────────────────────────────────────────────────────
export function applyFilter(term) {
  const tbody = $('table-body');
  const raw   = term.trim();
  const lower = raw.toLowerCase();
  const searchEl = $('search-input');

  // Build regex (regex mode) or use plain string
  let regex = null;
  if (state.regexSearch && raw) {
    try {
      regex = new RegExp(raw, 'gi');
      searchEl.classList.remove('regex-invalid');
    } catch (e) {
      searchEl.classList.add('regex-invalid');
      return; // invalid pattern — don't filter
    }
  } else {
    searchEl.classList.remove('regex-invalid');
  }

  const groupMatchCount = {}; // groupKey → count
  let totalMatches = 0;

  // Step 1: evaluate each visible data row — dim non-matches, highlight matches
  const dataRows = [...tbody.querySelectorAll('.row-data')];
  for (const tr of dataRows) {
    if (tr.dataset.collapsedByGroup) { tr.dataset.matchResult = '0'; continue; }

    const tds = tr.querySelectorAll('td');
    let matches = !raw;
    if (raw) {
      for (const td of tds) {
        const cellRaw = td.dataset.raw;
        if (state.regexSearch && regex) {
          regex.lastIndex = 0;
          if (regex.test(cellRaw)) { matches = true; break; }
        } else {
          if (cellRaw.toLowerCase().includes(lower)) { matches = true; break; }
        }
      }
    }

    const groupKey = tr.dataset.group || '__flat__';
    if (!groupMatchCount[groupKey]) groupMatchCount[groupKey] = 0;
    if (matches) { groupMatchCount[groupKey]++; totalMatches++; }

    tr.dataset.matchResult = matches ? '1' : '0';
    tr.classList.toggle('hidden', !matches && !!raw);
    tr.classList.remove('dimmed');

    for (const td of tds) {
      if (td.dataset.nestedCol) continue; // preserve nested badges
      if (raw && matches) {
        td.innerHTML = state.regexSearch && regex
          ? highlightRegex(td.dataset.raw, new RegExp(raw, 'gi'))
          : highlightText(td.dataset.raw, lower);
      } else {
        td.innerHTML = escHtml(td.dataset.raw);
      }
    }
  }

  // Step 2: reorder DOM — matching groups first, matching rows first within each group
  if (lower) {
    const sections = state.structure.groups.map(group => {
      const gname = group.name;
      const groupRow = gname !== null
        ? tbody.querySelector(`.row-group[data-group="${CSS.escape(gname)}"]`)
        : null;
      const rows = [...tbody.querySelectorAll(
        gname !== null ? `.row-data[data-group="${CSS.escape(gname)}"]` : '.row-data:not([data-group])'
      )];
      return { gname, groupRow, rows };
    });

    // Groups with at least one match float to top; ties preserve original order
    sections.sort((a, b) => {
      const aHas = (groupMatchCount[a.gname || '__flat__'] || 0) > 0 ? 0 : 1;
      const bHas = (groupMatchCount[b.gname || '__flat__'] || 0) > 0 ? 0 : 1;
      return aHas - bHas;
    });

    const frag = document.createDocumentFragment();
    for (const { groupRow, rows } of sections) {
      if (groupRow) frag.appendChild(groupRow);
      const matching    = rows.filter(r => r.dataset.matchResult === '1');
      const nonMatching = rows.filter(r => r.dataset.matchResult !== '1');
      for (const r of [...matching, ...nonMatching]) frag.appendChild(r);
    }
    tbody.innerHTML = '';
    tbody.appendChild(frag);
  } else {
    // Restore original insertion order
    const allRows = [...tbody.querySelectorAll('tr')];
    allRows.sort((a, b) => +a.dataset.originalIndex - +b.dataset.originalIndex);
    const frag = document.createDocumentFragment();
    for (const r of allRows) frag.appendChild(r);
    tbody.innerHTML = '';
    tbody.appendChild(frag);
  }

  // Step 3: update group header badges and dim groups with zero matches
  for (const groupRow of tbody.querySelectorAll('.row-group')) {
    const gname = groupRow.dataset.group;
    const count = groupMatchCount[gname] || 0;
    const total = +groupRow.querySelector('.group-badge').dataset.total;
    const badge = groupRow.querySelector('.group-badge');
    badge.textContent = lower ? `${count} match${count !== 1 ? 'es' : ''}` : `${total} rows`;
    groupRow.classList.toggle('hidden', !!lower && count === 0);
    groupRow.classList.remove('group-dimmed');
  }

  // Match count chip
  const matchCountEl = $('match-count');
  if (!lower) {
    matchCountEl.textContent = '';
    matchCountEl.className = 'match-count';
  } else {
    matchCountEl.textContent = `${totalMatches} match${totalMatches !== 1 ? 'es' : ''}`;
    matchCountEl.className = 'match-count has-matches';
  }

  renderStats(lower, groupMatchCount);
}

// ─────────────────────────────────────────────────────────────
// Column filters
// ─────────────────────────────────────────────────────────────
export function updateFilterBadge() {
  const badge = $('filter-badge');
  const count = Object.values(state.colFilters).reduce((n, s) => n + s.size, 0);
  if (count === 0) { badge.classList.add('hidden-el'); return; }
  badge.textContent = `${count} filter${count > 1 ? 's' : ''} \u00D7`;
  badge.classList.remove('hidden-el');
}

export function buildFilterBar() {
  const bar = $('filter-bar');
  if (!state.structure) return;

  // Hide filter bar if in tree or pivot mode
  if (state.treeActive || state.pivotActive) {
    bar.classList.add('hidden-el');
    return;
  }

  const { columns, groups } = state.structure;
  const strCols = columns.filter(c => c.type === 'string' && !state.hiddenCols.has(c.name));
  if (strCols.length === 0) { bar.classList.add('hidden-el'); return; }

  bar.innerHTML = `<span class="filter-bar-label">Filter</span>`;

  for (const col of strCols) {
    const values = [...new Set(groups.flatMap(g => g.rows).map(r => String(r[col.name] ?? '')).filter(Boolean))].sort();
    if (values.length < 2 || values.length > 20) continue;

    const active = state.colFilters[col.name] || new Set();
    const group = document.createElement('div');
    group.className = 'filter-group';
    group.innerHTML = `<span class="filter-group-name">${escHtml(col.name)}</span>`;

    for (const val of values) {
      const chip = document.createElement('span');
      chip.className = 'filter-chip' + (active.has(val) ? ' active' : '');
      chip.textContent = val;
      chip.dataset.col = col.name;
      chip.dataset.val = val;
      group.appendChild(chip);
    }

    if (active.size > 0) {
      const clr = document.createElement('span');
      clr.className = 'filter-clear';
      clr.textContent = '\u2715';
      clr.dataset.clearCol = col.name;
      group.appendChild(clr);
    }
    bar.appendChild(group);
  }

  const hasGroups = bar.querySelectorAll('.filter-group').length > 0;
  bar.classList.toggle('hidden-el', !hasGroups);
}

export function buildFilterDropdown() {
  const dropdown = $('filter-dropdown');
  if (!state.structure) return;
  const { columns, groups } = state.structure;
  const strCols = columns.filter(c => c.type === 'string' && !state.hiddenCols.has(c.name));

  dropdown.innerHTML = '';

  for (const col of strCols) {
    const values = [...new Set(groups.flatMap(g => g.rows).map(r => String(r[col.name] ?? '')).filter(Boolean))].sort();
    if (values.length < 2 || values.length > 20) continue;

    const active = state.colFilters[col.name] || new Set();
    const group = document.createElement('div');
    group.className = 'filter-group';

    const groupHeader = document.createElement('div');
    groupHeader.innerHTML = `<span class="filter-group-name">${escHtml(col.name)}</span>`;
    group.appendChild(groupHeader);

    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'filter-chips-wrap';

    for (const val of values) {
      const chip = document.createElement('span');
      chip.className = 'filter-chip' + (active.has(val) ? ' active' : '');
      chip.textContent = val;
      chip.dataset.col = col.name;
      chip.dataset.val = val;
      chipsWrap.appendChild(chip);
    }

    group.appendChild(chipsWrap);

    if (active.size > 0) {
      const clr = document.createElement('span');
      clr.className = 'filter-clear';
      clr.textContent = `\u2715 Clear ${col.name}`;
      clr.dataset.clearCol = col.name;
      group.appendChild(clr);
    }

    dropdown.appendChild(group);
  }
}

export function applyColFilters() {
  const tbody = $('table-body');
  const hasFilters = Object.values(state.colFilters).some(s => s.size > 0);
  for (const tr of tbody.querySelectorAll('.row-data')) {
    if (tr.dataset.collapsedByGroup) continue;
    if (!hasFilters) { tr.classList.remove('hidden'); continue; }
    const row = tr._rowData;
    if (!row) continue;
    let pass = true;
    for (const [col, vals] of Object.entries(state.colFilters)) {
      if (vals.size === 0) continue;
      if (!vals.has(String(row[col] ?? ''))) { pass = false; break; }
    }
    tr.classList.toggle('hidden', !pass);
  }
}

// ─────────────────────────────────────────────────────────────
// Column visibility dropdown
// ─────────────────────────────────────────────────────────────
export function buildColsDropdown() {
  const dropdown = $('cols-dropdown');
  const { columns } = state.structure;
  dropdown.innerHTML = '';
  for (const col of columns) {
    const item = document.createElement('label');
    item.className = 'cols-dropdown-item' + (state.hiddenCols.has(col.name) ? ' hidden-col' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !state.hiddenCols.has(col.name);
    cb.addEventListener('change', () => {
      if (cb.checked) state.hiddenCols.delete(col.name);
      else state.hiddenCols.add(col.name);
      item.classList.toggle('hidden-col', !cb.checked);
      rerender();
    });
    item.appendChild(cb);
    item.appendChild(document.createTextNode(col.name));
    dropdown.appendChild(item);
  }
}
