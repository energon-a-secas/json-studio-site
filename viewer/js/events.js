// ─────────────────────────────────────────────────────────────
// Event Handlers, Keyboard
// ─────────────────────────────────────────────────────────────
import { $, escHtml, fmt, showToast } from './utils.js';
import { state, pushViewState, resetViewerState } from './state.js';
import { DEMOS } from './demos.js';
import { rerender, applyHeatMap, clearHeatMap } from './table.js';
import {
  activatePivotMode, deactivatePivotMode, refreshPivot
} from './pivot.js';
import { exportCSV } from './export.js';
import {
  openNestedModal, openRecordModal, closeModal, renderNestedContent
} from './modal.js';
import { loadJSON } from './load.js';
import {
  applyFilter, buildFilterBar, updateFilterBadge,
  applyColFilters, buildColsDropdown
} from './filter.js';

// Re-export for use by other modules (table.js rerender, load.js, pivot.js)
export { applyFilter, buildFilterBar, updateFilterBadge, applyColFilters };
export { loadJSON };

// ─────────────────────────────────────────────────────────────
// Wire up all event listeners
// ─────────────────────────────────────────────────────────────
export function initEvents() {
  // Build example buttons
  const container = $('example-buttons');
  DEMOS.forEach((demo) => {
    const btn = document.createElement('button');
    btn.className = 'btn-example';
    btn.innerHTML = `${escHtml(demo.label)}<span class="btn-example-sub">${escHtml(demo.sub)}</span>`;
    btn.addEventListener('click', () => loadJSON(JSON.stringify(demo.data)));
    container.appendChild(btn);
  });

  // Load button
  $('btn-load').addEventListener('click', () => {
    const text = $('json-input').value.trim();
    if (!text) {
      const errEl = $('error-msg');
      errEl.textContent = 'Please paste JSON or upload a file first.';
      errEl.classList.add('visible');
      return;
    }
    loadJSON(text);
  });

  // Load new JSON button
  $('btn-new-json').addEventListener('click', () => {
    resetViewerState();
    $('view-viewer').classList.remove('active');
    $('view-input').style.display = '';
    $('btn-new-json').classList.add('hidden-el');
    $('btn-collapse-all').classList.add('hidden-el');
    $('btn-export-csv').classList.add('hidden-el');
    $('btn-sparklines').classList.add('hidden-el');
    $('btn-heat').classList.add('hidden-el');
    $('btn-columns').classList.add('hidden-el');
    $('cols-dropdown').classList.add('hidden-el');
    $('btn-pivot').classList.remove('active');
    $('filter-bar').classList.add('hidden-el');
    $('json-input').value = '';
    $('error-msg').classList.remove('visible');
  });

  // File picker
  $('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadJSON(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  });

  // Drag-and-drop onto drop zone
  const dropZone = $('drop-zone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => loadJSON(ev.target.result);
      reader.readAsText(file);
    } else {
      const text = e.dataTransfer.getData('text');
      if (text) loadJSON(text);
    }
  });

  // Search (debounced 150ms)
  let _searchTimer = null;
  $('search-input').addEventListener('input', (e) => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => { applyFilter(e.target.value); pushViewState(); }, 150);
  });

  $('btn-regex').addEventListener('click', () => {
    state.regexSearch = !state.regexSearch;
    const btn = $('btn-regex');
    const input = $('search-input');
    btn.classList.toggle('active', state.regexSearch);
    input.classList.toggle('regex-mode', state.regexSearch);
    input.placeholder = state.regexSearch ? 'Search with regex\u2026' : 'Search records\u2026';
    applyFilter(input.value);
  });

  // Collapse All / Expand All
  let _allCollapsed = false;
  $('btn-collapse-all').addEventListener('click', () => {
    _allCollapsed = !_allCollapsed;
    $('btn-collapse-all').textContent = _allCollapsed ? 'Expand All' : 'Collapse All';
    const tbody = $('table-body');
    for (const groupRow of tbody.querySelectorAll('.row-group')) {
      const isCollapsed = groupRow.classList.contains('collapsed');
      if (_allCollapsed && !isCollapsed) groupRow.click();
      if (!_allCollapsed && isCollapsed)  groupRow.click();
    }
  });

  // CSV Export
  $('btn-export-csv').addEventListener('click', () => exportCSV());

  // Column visibility
  $('btn-columns').addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = $('cols-dropdown');
    if (dropdown.classList.contains('hidden-el')) {
      buildColsDropdown();
      dropdown.classList.remove('hidden-el');
    } else {
      dropdown.classList.add('hidden-el');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cols-dropdown-wrap')) {
      $('cols-dropdown').classList.add('hidden-el');
    }
  });

  // Heat map toggle
  $('btn-heat').addEventListener('click', () => {
    state.heatMapEnabled = !state.heatMapEnabled;
    $('btn-heat').classList.toggle('active', state.heatMapEnabled);
    if (state.heatMapEnabled) applyHeatMap(); else clearHeatMap();
  });

  // Sparklines toggle
  $('btn-sparklines').addEventListener('click', () => {
    state.sparklinesEnabled = !state.sparklinesEnabled;
    $('btn-sparklines').classList.toggle('active', state.sparklinesEnabled);
    rerender();
  });

  // Filter badge click
  $('filter-badge').addEventListener('click', () => {
    state.colFilters = {};
    buildFilterBar();
    applyColFilters();
    updateFilterBadge();
    if (state.heatMapEnabled) applyHeatMap();
  });

  // Filter bar chip clicks
  $('filter-bar').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (chip) {
      const { col, val } = chip.dataset;
      if (!state.colFilters[col]) state.colFilters[col] = new Set();
      if (state.colFilters[col].has(val)) state.colFilters[col].delete(val);
      else state.colFilters[col].add(val);
      buildFilterBar(); applyColFilters(); updateFilterBadge();
      if (state.heatMapEnabled) applyHeatMap();
      return;
    }
    const clrBtn = e.target.closest('[data-clear-col]');
    if (clrBtn) {
      delete state.colFilters[clrBtn.dataset.clearCol];
      buildFilterBar(); applyColFilters(); updateFilterBadge();
      if (state.heatMapEnabled) applyHeatMap();
    }
  });

  // Pivot toggle
  $('btn-pivot').addEventListener('click', () => {
    if (state.pivotActive) deactivatePivotMode(); else activatePivotMode();
  });
  $('btn-exit-pivot').addEventListener('click', deactivatePivotMode);

  // Pivot selectors
  $('pivot-user-select').addEventListener('change', refreshPivot);
  $('pivot-metric-select').addEventListener('change', refreshPivot);

  // Chart toggle
  $('btn-chart-toggle').addEventListener('click', () => {
    if (!state.pivotActive) return;
    state.timelineMode = !state.timelineMode;
    $('btn-chart-toggle').classList.toggle('active', state.timelineMode);
    $('btn-period-order').classList.toggle('hidden-el', !state.timelineMode);
    if (!state.timelineMode) state.periodReversed = false;
    refreshPivot();
  });

  // Period order toggle
  $('btn-period-order').addEventListener('click', () => {
    state.periodReversed = !state.periodReversed;
    refreshPivot();
  });

  // Timeline tooltip
  const _tooltip = document.createElement('div');
  _tooltip.className = 'timeline-tooltip';
  document.body.appendChild(_tooltip);
  document.addEventListener('mouseover', (e) => {
    const dot = e.target.closest('.timeline-dot');
    if (!dot) return;
    _tooltip.innerHTML = `<strong>${dot.dataset.series}</strong>${dot.dataset.period}: <b>${fmt(Number(dot.dataset.value))}</b>`;
    _tooltip.classList.add('visible');
  });
  document.addEventListener('mousemove', (e) => {
    if (!_tooltip.classList.contains('visible')) return;
    _tooltip.style.left = (e.clientX + 14) + 'px';
    _tooltip.style.top  = (e.clientY - 28) + 'px';
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.timeline-dot')) _tooltip.classList.remove('visible');
  });

  // Row click → copy, nested, or record modal
  $('table-body').addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-row-btn');
    if (copyBtn) {
      e.stopPropagation();
      const tr = copyBtn.closest('tr');
      if (tr && tr._rowData) {
        navigator.clipboard.writeText(JSON.stringify(tr._rowData, null, 2))
          .then(() => showToast('Row JSON copied'))
          .catch(() => showToast('Copy failed'));
      }
      return;
    }
    const badge = e.target.closest('.nested-badge');
    if (badge) {
      const td = badge.closest('td');
      const tr = badge.closest('tr');
      if (tr && !tr.classList.contains('hidden')) openNestedModal(tr, td.dataset.nestedCol);
      return;
    }
    const tr = e.target.closest('.row-data');
    if (tr && !tr.classList.contains('hidden')) openRecordModal(tr);
  });

  // Period filter pills (event delegation on modal body)
  $('modal-body').addEventListener('click', (e) => {
    const pill = e.target.closest('.nested-filter-pill');
    if (pill && state.nestedModalState) renderNestedContent(pill.dataset.period);
  });

  // Close on X button, backdrop click, or Escape
  $('modal-close').addEventListener('click', closeModal);
  $('record-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); return; }

    // Arrow key row navigation — only when modal is closed and not typing in an input
    if (e.target.matches('input, textarea, select')) return;
    const modalOpen = !$('record-modal').classList.contains('hidden-el');
    if (modalOpen) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = [...document.querySelectorAll('#table-body .row-data:not(.hidden)')];
      if (rows.length === 0) return;
      const currentIdx = rows.findIndex(r => r.classList.contains('keyboard-focused'));
      rows.forEach(r => r.classList.remove('keyboard-focused'));
      let next = e.key === 'ArrowDown' ? currentIdx + 1 : currentIdx - 1;
      next = Math.max(0, Math.min(next, rows.length - 1));
      rows[next].classList.add('keyboard-focused');
      rows[next].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    if (e.key === 'Enter') {
      const focused = document.querySelector('#table-body .row-data.keyboard-focused');
      if (focused) openRecordModal(focused);
    }
  });
}
