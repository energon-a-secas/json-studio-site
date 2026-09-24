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
// Returns true when the data rendered, false when it was refused; the error
// text is in #error-msg either way. Text goes through loadJSON, an already
// parsed value (the embed receives one by postMessage) through loadValue.
export function loadJSON(text) {
  const errEl = $('error-msg');
  errEl.classList.remove('visible');

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    errEl.textContent = 'Invalid JSON: ' + e.message;
    errEl.classList.add('visible');
    return false;
  }

  const ok = loadValue(parsed);
  // The session copy lets a refresh keep the data. An embed never keeps one:
  // the host owns the data and the visitor never chose to store it here.
  if (ok && !state.embedded) {
    try { sessionStorage.setItem('viewer-session-json', text); } catch (e) {}
  }
  return ok;
}

export function loadValue(parsed) {
  const errEl = $('error-msg');
  errEl.classList.remove('visible');

  try {
    state.structure = detectStructure(parsed);
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.add('visible');
    return false;
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

  // Switch views (the input view and its two return buttons exist only on
  // the full page; embed.html has neither)
  const inputView = $('view-input');
  if (inputView) inputView.style.display = 'none';
  $('view-viewer').classList.add('active');
  $('btn-new-json')?.classList.remove('hidden-el');
  $('btn-export-csv').classList.remove('hidden-el');
  $('btn-sparklines').classList.remove('hidden-el');
  $('btn-heat').classList.remove('hidden-el');
  $('btn-columns').classList.remove('hidden-el');
  $('btn-filters').classList.remove('hidden-el');
  $('btn-tree').classList.remove('hidden-el');
  $('btn-reset')?.classList.remove('hidden-el');

  // Apply pending URL state
  if (state.pendingState) { applyViewState(state.pendingState); state.pendingState = null; }
  return true;
}
