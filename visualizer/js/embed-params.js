// ─────────────────────────────────────────────────────────────
// The embed's URL contract, as pure functions so node:test can pin them.
// Presentation only: the data itself never travels in a URL (see embed.js).
// ─────────────────────────────────────────────────────────────

export const VIEWS = ['table', 'pivot', 'tree'];

const OFF = new Set(['off', '0', 'false', 'none', 'no']);

// A sort spec is `col` or `col:desc`. Only an exact asc/desc suffix is a
// direction, so a column whose name carries a colon still round-trips.
export function parseSort(raw) {
  if (!raw) return null;
  const m = String(raw).match(/^(.*?)(?::(asc|desc))?$/i);
  const col = m[1].trim();
  if (!col) return null;
  return { col, dir: (m[2] || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc' };
}

export function parseEmbedParams(search = '') {
  const q = new URLSearchParams(search);
  const get = name => q.get(name);
  const isOff = name => q.has(name) && OFF.has(String(get(name)).trim().toLowerCase());
  const list = name => (get(name) || '').split(',').map(s => s.trim()).filter(Boolean);

  // pivot=user,metric: either side may be blank, so empties are kept here.
  const pivotRaw = (get('pivot') ?? '').split(',').map(s => s.trim());
  const pivot = q.has('pivot') && (pivotRaw[0] || pivotRaw[1])
    ? { user: pivotRaw[0] || null, metric: pivotRaw[1] || null }
    : null;

  const bgRaw = (get('bg') || '').trim().replace(/^#/, '');
  const titleRaw = (get('title') || '').trim();

  return {
    view: VIEWS.includes(get('view')) ? get('view') : 'table',
    title: titleRaw && titleRaw.toLowerCase() !== 'off' ? titleRaw : '',
    toolbar: !isOff('toolbar'),
    stats: !isOff('stats'),
    fit: get('fit') === 'content' ? 'content' : 'box',
    hide: list('hide'),
    sort: parseSort(get('sort')),
    pivot,
    chart: get('chart') === 'timeline',
    bg: /^[0-9a-f]{6}$/i.test(bgRaw) ? '#' + bgRaw.toLowerCase() : null,
  };
}

// The inverse, for the builder: only what differs from the defaults is written,
// so a default embed is a bare embed.html.
export function buildEmbedQuery(o = {}) {
  const p = new URLSearchParams();
  if (o.view && o.view !== 'table' && VIEWS.includes(o.view)) p.set('view', o.view);
  if (o.title) p.set('title', o.title);
  if (o.toolbar === false) p.set('toolbar', 'off');
  if (o.stats === false) p.set('stats', 'off');
  if (o.fit === 'content') p.set('fit', 'content');
  if (o.hide && o.hide.length) p.set('hide', o.hide.join(','));
  if (o.sort && o.sort.col) p.set('sort', o.sort.dir === 'desc' ? `${o.sort.col}:desc` : o.sort.col);
  if (o.pivot && (o.pivot.user || o.pivot.metric)) {
    p.set('pivot', [o.pivot.user || '', o.pivot.metric || ''].join(','));
  }
  if (o.chart) p.set('chart', 'timeline');
  if (o.bg) p.set('bg', String(o.bg).trim().replace(/^#/, ''));
  return p.toString();
}
