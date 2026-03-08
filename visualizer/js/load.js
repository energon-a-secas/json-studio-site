// ─────────────────────────────────────────────────────────────
// Load & View Transition, View State
// ─────────────────────────────────────────────────────────────
import { $ } from './utils.js';
import { state, resetViewerState } from './state.js';
import { renderTable, applyHeatMap, detectStructure } from './table.js';
import { detectPivotConfig, renderPivotToolbar } from './pivot.js';
import { applyFilter, buildFilterBar, updateFilterBadge, applyColFilters } from './filter.js';

// ─────────────────────────────────────────────────────────────
// Apply view state from URL hash
// ─────────────────────────────────────────────────────────────
export function applyViewState(vs) {
  if (!vs || !state.structure) return;
  if (vs.s) {
    state.sortCol = vs.s; state.sortDir = vs.d || 'asc'; state.sortClicks = 0;
    renderTable(state.structure);
    applyColFilters();
    if (state.heatMapEnabled) applyHeatMap();
  }
  if (vs.h && vs.h.length) {
    vs.h.forEach(c => state.hiddenCols.add(c));
    renderTable(state.structure);
    buildFilterBar();
    updateFilterBadge();
  }
  if (vs.q) {
    $('search-input').value = vs.q;
    applyFilter(vs.q);
  }
}

// ─────────────────────────────────────────────────────────────
// Load & View Transition
// ─────────────────────────────────────────────────────────────
export function loadJSON(text) {
  const errEl = $('error-msg');
  errEl.classList.remove('visible');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    errEl.textContent = 'Invalid JSON: ' + e.message;
    errEl.classList.add('visible');
    return;
  }

  try {
    state.structure = detectStructure(parsed);
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.add('visible');
    return;
  }

  resetViewerState();

  // Detect pivot eligibility
  state.pivotConfig = detectPivotConfig(parsed);
  const btnPivot = $('btn-pivot');
  const pivotHint = $('pivot-hint');
  if (state.pivotConfig) {
    btnPivot.classList.remove('hidden-el');
    if (pivotHint) pivotHint.classList.remove('hidden-el');
    renderPivotToolbar(state.pivotConfig);
  } else {
    btnPivot.classList.add('hidden-el');
    if (pivotHint) pivotHint.classList.add('hidden-el');
  }

  renderTable(state.structure);
  buildFilterBar();
  updateFilterBadge();
  $('search-input').value = '';
  applyFilter('');

  // Switch views
  $('view-input').style.display = 'none';
  $('view-viewer').classList.add('active');
  $('btn-new-json').classList.remove('hidden-el');
  $('btn-collapse-all').classList.remove('hidden-el');
  $('btn-export-csv').classList.remove('hidden-el');
  $('btn-sparklines').classList.remove('hidden-el');
  $('btn-heat').classList.remove('hidden-el');
  $('btn-columns').classList.remove('hidden-el');

  // Apply pending URL state then save JSON to session
  if (state.pendingState) { applyViewState(state.pendingState); state.pendingState = null; }
  try { sessionStorage.setItem('viewer-session-json', text); } catch (e) {}
}
