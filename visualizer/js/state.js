// ─────────────────────────────────────────────────────────────
// Shared mutable state
// ─────────────────────────────────────────────────────────────
import { $ } from './utils.js';

export const state = {
  structure:         null,   // { mode, groups, columns }
  pivotConfig:       null,   // { identifierField, pivotField, periodKeys, metrics } | null
  pivotActive:       false,
  treeActive:        false,  // true = org tree mode active
  treeData:          null,   // { roots, children, byId, idField } | null
  treeHierarchy:     null,   // { idField, refField } | null
  nestedModalState:  null,   // { matchingRows, isObjOfObjs, sortedPeriods, metricList }
  sortCol:           null,   // column name, or null for natural order
  sortDir:           'asc',  // 'asc' | 'desc'
  sortClicks:        0,      // tracks 3-click cycle: asc → desc → off
  timelineMode:      false,  // true = show timeline chart instead of pivot table
  periodReversed:    false,  // true = X axis runs high → low
  hiddenCols:        new Set(), // column names hidden from the table
  heatMapEnabled:    false,  // true = color-tint numeric cells by value range
  colFilters:        {},     // { colName: Set<string> } — active value filters per column
  sparklinesEnabled: false,  // true = show inline mini bar in numeric cells
  regexSearch:       false,  // true = use regex in search box
  pendingState:      null,   // view state to apply after next loadJSON
};

// ─────────────────────────────────────────────────────────────
// URL / Session state
// ─────────────────────────────────────────────────────────────
export function pushViewState() {
  const vs = {
    q: $('search-input').value || undefined,
    s: state.sortCol || undefined,
    d: state.sortDir !== 'asc' ? state.sortDir : undefined,
    h: state.hiddenCols.size ? [...state.hiddenCols] : undefined,
  };
  const hasState = vs.q || vs.s || vs.h;
  try {
    const hash = hasState
      ? '#v=' + btoa(encodeURIComponent(JSON.stringify(vs)))
      : location.pathname + location.search;
    history.replaceState(null, '', hasState ? hash : location.pathname + location.search);
  } catch (e) { /* ignore */ }
}

export function parseViewStateHash() {
  const hash = location.hash;
  if (!hash.startsWith('#v=')) return null;
  try {
    return JSON.parse(decodeURIComponent(atob(hash.slice(3))));
  } catch (e) {
    return null;
  }
}

export function resetViewerState() {
  state.sortCol = null;
  state.sortDir = 'asc';
  state.sortClicks = 0;
  state.hiddenCols.clear();
  state.heatMapEnabled = false;
  state.colFilters = {};
  state.sparklinesEnabled = false;
  state.pivotActive = false;
  state.treeActive = false;
  state.treeData = null;
  state.treeHierarchy = null;
  state.timelineMode = false;
  state.periodReversed = false;
  state.pivotConfig = null;
  $('btn-heat').classList.remove('active');
  $('btn-sparklines').classList.remove('active');
  $('btn-chart-toggle').classList.remove('active');
  $('btn-tree')?.classList.remove('active');
  $('btn-period-order').classList.add('hidden-el');
  $('pivot-toolbar').classList.add('hidden-el');
  $('pivot-table').classList.add('hidden-el');
  $('timeline-area').classList.add('hidden-el');
  $('tree-area')?.classList.add('hidden-el');
  $('data-table').classList.remove('hidden-el');
  $('search-bar').style.display = '';
}
