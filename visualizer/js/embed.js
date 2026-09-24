// ─────────────────────────────────────────────────────────────
// The embeddable visualizer.
//
// The same table, pivot, timeline and tree as index.html, in a shell with no
// header, no input view and no analytics. It is inert until a host page
// speaks to it: the data arrives by postMessage, never in the URL, and the
// embed writes nothing into the visitor's browser (no storage, no URL hash).
// That is what lets a host render its own tables and charts here without the
// data leaving its page: everything runs inside this frame, and the CSP in
// embed.html lets this page request nothing but its own files.
//
// URL settings (presentation only; embed-params.js parses them):
//
//   view=table|pivot|tree   starting view (default table; pivot falls back to
//                           table when the data has nothing to pivot)
//   title=<text>            a caption above the table
//   toolbar=off             no search bar and no view buttons; the host drives it
//   stats=off               no stats sidebar
//   hide=col,col            columns to hide
//   sort=col or col:desc    initial sort
//   pivot=user,metric       pivot selection, either side may be blank; implies view=pivot
//   chart=timeline          show the pivot as a chart rather than a table
//   fit=content             grow with the data and report the height, instead of
//                           filling the iframe and scrolling inside it
//   bg=<hex>                page background, to blend with the host
//
// Host page → embed (every type starts with "jsonstudio:"):
//
//   { type: 'jsonstudio:load',    data }              an object, an array or a JSON string
//   { type: 'jsonstudio:view',    view }              'table' | 'pivot' | 'tree'
//   { type: 'jsonstudio:search',  q }
//   { type: 'jsonstudio:sort',    col, dir }          dir 'asc' | 'desc'; col null clears
//   { type: 'jsonstudio:columns', hide: [...] }       the full list of hidden columns
//   { type: 'jsonstudio:pivot',   user, metric, chart }
//   { type: 'jsonstudio:state' }                      ask what it is showing
//
// Embed → host page (every message carries source: 'jsonstudio'):
//
//   ready     the embed is listening; send load now
//   loaded    mode, rows, groups, columns, pivot (whether the data can pivot), view
//   state     view, search, sort, hidden, visible, pivot
//   row       the visitor clicked a row: data, group
//   height    px, only with fit=content
//   error     message
//
// Replies go to '*' until the host has spoken (ready and height carry nothing
// from any payload) and afterwards only to the origin that sent the data.
// ─────────────────────────────────────────────────────────────
import { $ } from './utils.js';
import { state } from './state.js';
import { initRerender, rerender } from './table.js';
import * as eventsMod from './events.js';
import { loadValue, loadJSON } from './load.js';
import { activatePivotMode, deactivatePivotMode, refreshPivot } from './pivot.js';
import { activateTreeMode, deactivateTreeMode } from './tree.js';
import { applyFilter, buildFilterBar, updateFilterBadge } from './filter.js';
import { parseEmbedParams, VIEWS } from './embed-params.js';

const SOURCE = 'jsonstudio';
const PREFIX = 'jsonstudio:';
const opts = parseEmbedParams(location.search);
const framed = window.parent !== window;

state.embedded = true;
initRerender(eventsMod);
eventsMod.initViewerEvents();

let hostOrigin = '*';

function post(type, detail = {}) {
  if (!framed) return;
  window.parent.postMessage({ source: SOURCE, type, ...detail }, hostOrigin);
}

function fail(message) {
  const errEl = $('error-msg');
  errEl.textContent = message;
  errEl.classList.add('visible');
  post('error', { message });
}

// ── Presentation from the URL ────────────────────────────────
const root = document.documentElement;
root.dataset.fit = opts.fit;
if (!opts.toolbar) root.dataset.toolbar = 'off';
if (!opts.stats) root.dataset.stats = 'off';
if (opts.bg) document.body.style.background = opts.bg;

const caption = $('embed-caption');
if (opts.title) caption.textContent = opts.title; else caption.hidden = true;

// Opened as a page rather than framed: say what this is instead of waiting.
if (!framed) $('embed-empty').classList.add('is-direct');

// ── View, sort, columns, search, pivot ───────────────────────
function currentView() {
  return state.pivotActive ? 'pivot' : state.treeActive ? 'tree' : 'table';
}

function setView(view) {
  if (!VIEWS.includes(view)) return false;
  if (view === 'pivot') {
    if (!state.pivotConfig) return false;
    if (state.treeActive) deactivateTreeMode();
    if (!state.pivotActive) activatePivotMode();
  } else if (view === 'tree') {
    if (state.pivotActive) deactivatePivotMode();
    if (!state.treeActive) activateTreeMode();
  } else {
    if (state.pivotActive) deactivatePivotMode();
    if (state.treeActive) deactivateTreeMode();
  }
  return currentView() === view;
}

function setSort(col, dir) {
  state.sortCol = col ? String(col) : null;
  state.sortDir = dir === 'desc' ? 'desc' : 'asc';
  state.sortClicks = 0;
  rerender();
}

function setHidden(cols) {
  state.hiddenCols = new Set(cols.map(String));
  rerender();
  buildFilterBar();
  updateFilterBadge();
}

function setSearch(q) {
  const term = q == null ? '' : String(q);
  $('search-input').value = term;
  applyFilter(term);
}

function setPivot({ user, metric, chart } = {}) {
  if (!state.pivotConfig) return false;
  if (!state.pivotActive && !setView('pivot')) return false;
  const pick = (id, value) => {
    if (value == null) return;
    const sel = $(id);
    const opt = [...sel.options].find(o => o.value === String(value));
    if (opt) sel.value = opt.value;
  };
  pick('pivot-user-select', user);
  pick('pivot-metric-select', metric);
  if (typeof chart === 'boolean') {
    state.timelineMode = chart;
    $('btn-chart-toggle').classList.toggle('active', chart);
    $('btn-period-order').classList.toggle('hidden-el', !chart);
    if (!chart) state.periodReversed = false;
  }
  refreshPivot();
  return true;
}

function applyStartingView() {
  if (opts.hide.length) setHidden(opts.hide);
  if (opts.sort) setSort(opts.sort.col, opts.sort.dir);
  if (opts.view !== 'table') setView(opts.view);
  if (opts.pivot || opts.chart) setPivot({ ...(opts.pivot || {}), chart: opts.chart || undefined });
}

// ── What the host is told ────────────────────────────────────
function summary() {
  const s = state.structure;
  return {
    mode: s.mode,
    rows: s.groups.reduce((n, g) => n + g.rows.length, 0),
    groups: s.mode === 'grouped' ? s.groups.map(g => g.name) : [],
    columns: s.columns.map(c => ({ name: c.name, type: c.type })),
    pivot: Boolean(state.pivotConfig),
    view: currentView(),
  };
}

function report() {
  return {
    view: currentView(),
    search: $('search-input').value,
    sort: state.sortCol ? { col: state.sortCol, dir: state.sortDir } : null,
    hidden: [...state.hiddenCols],
    visible: document.querySelectorAll('#table-body .row-data:not(.hidden)').length,
    pivot: state.pivotActive ? {
      user: $('pivot-user-select').value,
      metric: $('pivot-metric-select').value,
      chart: state.timelineMode,
    } : null,
  };
}

// fit=content: the body is as tall as the data, and the host is told.
function reportHeight() {
  if (opts.fit !== 'content') return;
  post('height', { px: Math.ceil(document.body.getBoundingClientRect().height) });
}
if (opts.fit === 'content' && 'ResizeObserver' in window) {
  new ResizeObserver(() => reportHeight()).observe(document.body);
}

// ── Load ─────────────────────────────────────────────────────
function load(data) {
  let ok;
  if (typeof data === 'string') ok = loadJSON(data);
  else if (data && typeof data === 'object') ok = loadValue(data);
  else { fail('Send an object, an array or a JSON string in data.'); return; }
  if (!ok) { post('error', { message: $('error-msg').textContent }); return; }

  $('embed-empty').hidden = true;
  const s = summary();
  $('embed-foot-count').textContent =
    `${s.rows} row${s.rows === 1 ? '' : 's'} · ${s.columns.length} column${s.columns.length === 1 ? '' : 's'}`;
  applyStartingView();
  post('loaded', summary());
  reportHeight();
}

// A row click is the host's to react to, next to the modal the visitor sees.
$('table-body').addEventListener('click', e => {
  if (e.target.closest('.copy-row-btn, .nested-badge')) return;
  const tr = e.target.closest('.row-data');
  if (!tr || !tr._rowData) return;
  post('row', { data: tr._rowData, group: tr.dataset.group || null });
});

// ── Host page → embed ────────────────────────────────────────
// A fixed command set, matched by name. Nothing here evaluates host input.
window.addEventListener('message', e => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string' || !msg.type.startsWith(PREFIX)) return;
  hostOrigin = e.origin && e.origin !== 'null' ? e.origin : '*';
  const cmd = msg.type.slice(PREFIX.length);
  if (cmd === 'load') { load(msg.data); return; }
  if (!state.structure) { fail('No data loaded yet: send jsonstudio:load first.'); return; }
  switch (cmd) {
    case 'view':    setView(msg.view); break;
    case 'search':  setSearch(msg.q); break;
    case 'sort':    setSort(msg.col, msg.dir); break;
    case 'columns': setHidden(Array.isArray(msg.hide) ? msg.hide : []); break;
    case 'pivot':   setPivot(msg); break;
    case 'state':   break;
    default:        return;
  }
  post('state', report());
  reportHeight();
});

post('ready', { version: 1, views: VIEWS });
