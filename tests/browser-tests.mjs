// The browser integration suite. See browser.mjs for the tiny framework.

import { group, it, assert, boot, listen, until, wait, finish } from './browser.mjs';

const EMBED = '../visualizer/embed.html';
const APP = '../visualizer/index.html';
const BUILDER = '../visualizer/embed-builder.html';

const FLAT = [
  { name: 'Ada', tickets: 3, team: 'core' },
  { name: 'Bo',  tickets: 5, team: 'core' },
  { name: 'Cy',  tickets: 1, team: 'edge' },
];

// Grouped, with a period → metrics field, which is what the pivot detects.
const GROUPED = {
  Platform: { people: [
    { name: 'Ada', role: 'lead', hours: { '1m': { h: 4 }, '3m': { h: 12 } } },
  ] },
  Mobile: { people: [
    { name: 'Ada', role: 'dev', hours: { '1m': { h: 2 }, '3m': { h: 6 } } },
    { name: 'Bo',  role: 'dev', hours: { '1m': { h: 8 }, '3m': { h: 20 } } },
  ] },
};

const rowsOf = ctx => ctx.doc.querySelectorAll('#table-body .row-data');
const visibleRows = ctx => ctx.doc.querySelectorAll('#table-body .row-data:not(.hidden)');
const shown = (ctx, sel) => ctx.win.getComputedStyle(ctx.doc.querySelector(sel)).display !== 'none';

async function withEmbed(query, fn, size) {
  const bus = listen();
  const ctx = await boot(EMBED + query, size);
  try {
    await until(() => bus.last('ready'), { label: 'the ready message' });
    await fn(ctx, bus);
  } finally {
    bus.stop();
    ctx.destroy();
  }
}

const load = (ctx, bus, data) => {
  const before = bus.seen.length;
  ctx.win.postMessage({ type: 'jsonstudio:load', data }, '*');
  return until(() => bus.seen.slice(before).find(m => m.type === 'loaded' || m.type === 'error'),
    { label: 'a loaded or error message' });
};

const command = (ctx, bus, msg) => {
  const before = bus.seen.length;
  ctx.win.postMessage(msg, '*');
  return until(() => bus.seen.slice(before).find(m => m.type === 'state' || m.type === 'error'),
    { label: `a reply to ${msg.type}` });
};

// ── Boot ────────────────────────────────────────────────────────────────────
group('embed boot');

await it('boots with no console errors, waits for data, and says it is ready', async () => {
  await withEmbed('', async (ctx, bus) => {
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
    assert.ok(shown(ctx, '#embed-empty'), 'the waiting placeholder should be visible');
    assert.ok(!shown(ctx, '#view-viewer'), 'the viewer should stay hidden until data arrives');
    const ready = bus.last('ready');
    assert.deepEqual(ready.views, ['table', 'pivot', 'tree']);
  });
});

await it('its CSP names no host but its own, and it requested nothing off-origin', async () => {
  await withEmbed('', async (ctx) => {
    const csp = ctx.doc.querySelector('meta[http-equiv="Content-Security-Policy"]').content;
    assert.ok(!/https?:/.test(csp), `the embed CSP names a host: ${csp}`);
    assert.includes(csp, "connect-src 'none'");
    assert.includes(csp, "script-src 'self'");
    const external = ctx.win.performance.getEntriesByType('resource')
      .map(r => r.name).filter(n => !n.startsWith(ctx.win.location.origin));
    assert.equal(external.length, 0, `off-origin requests: ${external.join(', ')}`);
    assert.equal(ctx.doc.querySelectorAll('script[src^="http"], link[href^="http"]').length, 0,
      'a script or stylesheet points off-origin');
  });
});

// ── Loading ─────────────────────────────────────────────────────────────────
group('embed load');

await it('renders an array posted by the host and reports what it loaded', async () => {
  await withEmbed('', async (ctx, bus) => {
    const reply = await load(ctx, bus, FLAT);
    assert.equal(reply.type, 'loaded', reply.message);
    assert.equal(reply.rows, 3);
    assert.equal(reply.mode, 'flat');
    assert.deepEqual(reply.columns.map(c => c.name), ['name', 'tickets', 'team']);
    assert.equal(reply.pivot, false);
    assert.equal(rowsOf(ctx).length, 3);
    assert.ok(!shown(ctx, '#embed-empty'), 'the placeholder should go away');
    assert.includes(ctx.doc.querySelector('#embed-foot-count').textContent, '3 rows');
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
  });
});

await it('accepts a JSON string too, and a grouped object reports its groups and pivot', async () => {
  await withEmbed('', async (ctx, bus) => {
    const reply = await load(ctx, bus, JSON.stringify(GROUPED));
    assert.equal(reply.type, 'loaded', reply.message);
    assert.equal(reply.mode, 'grouped');
    assert.deepEqual(reply.groups, ['Platform', 'Mobile']);
    assert.equal(reply.pivot, true, 'period metrics should make the data pivotable');
    assert.equal(rowsOf(ctx).length, 3);
  });
});

await it('refuses what it cannot render and says why, without dropping what it had', async () => {
  await withEmbed('', async (ctx, bus) => {
    const bad = await load(ctx, bus, '{not json');
    assert.equal(bad.type, 'error');
    assert.includes(bad.message, 'Invalid JSON');
    assert.ok(shown(ctx, '#error-msg'));

    const scalar = await load(ctx, bus, 42);
    assert.equal(scalar.type, 'error');

    const prim = await load(ctx, bus, '"a string"');
    assert.equal(prim.type, 'error');
    assert.includes(prim.message, 'must start with');

    const ok = await load(ctx, bus, FLAT);
    assert.equal(ok.type, 'loaded');
    const again = await load(ctx, bus, '[1, 2');
    assert.equal(again.type, 'error');
    assert.equal(rowsOf(ctx).length, 3, 'a bad second payload should leave the first table standing');
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
  });
});

await it('a command before any data is answered with an error, not a crash', async () => {
  await withEmbed('', async (ctx, bus) => {
    const reply = await command(ctx, bus, { type: 'jsonstudio:view', view: 'pivot' });
    assert.equal(reply.type, 'error');
    assert.includes(reply.message, 'No data loaded');
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
  });
});

// ── The promise ─────────────────────────────────────────────────────────────
group('embed writes nothing');

await it('never reads a session copy left by the Visualizer, and never writes one', async () => {
  // The harness shares this origin with the embed, so it shares sessionStorage.
  sessionStorage.setItem('viewer-import', '[{"secret":"PRIVATE-IMPORT"}]');
  sessionStorage.setItem('viewer-session-json', '[{"secret":"PRIVATE-SESSION"}]');
  try {
    await withEmbed('', async (ctx, bus) => {
      await wait(150);
      assert.ok(!ctx.doc.body.textContent.includes('PRIVATE'), 'the embed rendered a stored payload');
      assert.ok(!shown(ctx, '#view-viewer'), 'nothing should render before the host speaks');
      // The string path is the one that keeps a session copy on the full page,
      // and typing or sorting is what writes the URL hash there. Both must be
      // exercised, or a removed guard would still pass this test.
      await load(ctx, bus, JSON.stringify(FLAT));
      await command(ctx, bus, { type: 'jsonstudio:search', q: 'Ada' });
      ctx.doc.querySelector('#table-head th.sortable').click();
      const input = ctx.doc.querySelector('#search-input');
      input.value = 'Bo';
      input.dispatchEvent(new ctx.win.Event('input', { bubbles: true }));
      await wait(250);
      assert.equal(sessionStorage.getItem('viewer-session-json'), '[{"secret":"PRIVATE-SESSION"}]',
        'the embed wrote the host data into sessionStorage');
      assert.equal(sessionStorage.getItem('viewer-import'), '[{"secret":"PRIVATE-IMPORT"}]');
      assert.equal(ctx.win.location.hash, '', 'the search term was written into the URL');
      assert.equal(ctx.win.localStorage.length, 0, 'the embed wrote localStorage');
    });
  } finally {
    sessionStorage.removeItem('viewer-import');
    sessionStorage.removeItem('viewer-session-json');
  }
});

// ── URL settings ────────────────────────────────────────────────────────────
group('embed url settings');

await it('obeys view, title, toolbar, stats, hide, sort and bg', async () => {
  await withEmbed('?view=pivot&title=Custom+caption&stats=off&toolbar=off&hide=role&sort=name:desc&bg=0b1120',
    async (ctx, bus) => {
      const reply = await load(ctx, bus, GROUPED);
      assert.equal(reply.type, 'loaded', reply.message);
      assert.equal(reply.view, 'pivot', 'view=pivot did not open the pivot');
      assert.equal(ctx.doc.querySelector('#embed-caption').textContent, 'Custom caption');
      assert.ok(!shown(ctx, '#stats-sidebar'), 'stats=off left the sidebar visible');
      assert.ok(!shown(ctx, '#search-bar'), 'toolbar=off left the search bar visible');
      assert.ok(!shown(ctx, '#pivot-toolbar'), 'toolbar=off left the pivot toolbar visible');
      assert.ok(shown(ctx, '#pivot-table'));
      const heads = [...ctx.doc.querySelectorAll('#table-head th')].map(th => th.textContent.replace(/[▲▼⇅]/g, '').trim());
      assert.ok(!heads.includes('role'), `hide=role left the column: ${heads.join(',')}`);
      assert.equal(ctx.win.getComputedStyle(ctx.doc.body).backgroundColor, 'rgb(11, 17, 32)');
      const state = await command(ctx, bus, { type: 'jsonstudio:state' });
      assert.deepEqual(state.sort, { col: 'name', dir: 'desc' });
      assert.deepEqual(state.hidden, ['role']);
      assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
    });
});

await it('view=pivot falls back to the table when the data cannot pivot', async () => {
  await withEmbed('?view=pivot', async (ctx, bus) => {
    const reply = await load(ctx, bus, FLAT);
    assert.equal(reply.view, 'table');
    assert.ok(shown(ctx, '#data-table'));
  });
});

await it('fit=content sizes the body to the data and reports the height', async () => {
  await withEmbed('?fit=content', async (ctx, bus) => {
    await load(ctx, bus, FLAT);
    const h = await until(() => bus.last('height'), { label: 'a height message' });
    assert.gt(h.px, 100);
    assert.ok(h.px < 700, `the frame is 700px tall but the content reported ${h.px}px, so it is filling the box instead of fitting the data`);
  }, { width: 900, height: 700 });
});

// ── Commands ────────────────────────────────────────────────────────────────
group('embed commands');

await it('answers view, search, sort, columns and state, and ignores what is not addressed to it', async () => {
  await withEmbed('', async (ctx, bus) => {
    await load(ctx, bus, GROUPED);

    let s = await command(ctx, bus, { type: 'jsonstudio:view', view: 'pivot' });
    assert.equal(s.view, 'pivot');
    assert.equal(s.pivot.user, 'Ada');
    assert.equal(s.pivot.metric, 'h');

    s = await command(ctx, bus, { type: 'jsonstudio:pivot', user: 'Bo', chart: true });
    assert.equal(s.pivot.user, 'Bo');
    assert.equal(s.pivot.chart, true);
    assert.ok(shown(ctx, '#timeline-area'), 'chart:true did not show the timeline');

    s = await command(ctx, bus, { type: 'jsonstudio:view', view: 'table' });
    assert.equal(s.view, 'table');
    assert.equal(s.pivot, null);

    s = await command(ctx, bus, { type: 'jsonstudio:search', q: 'Bo' });
    assert.equal(s.search, 'Bo');
    assert.equal(s.visible, 1);
    assert.equal(visibleRows(ctx).length, 1);

    s = await command(ctx, bus, { type: 'jsonstudio:search', q: '' });
    assert.equal(s.visible, 3);

    s = await command(ctx, bus, { type: 'jsonstudio:sort', col: 'role', dir: 'desc' });
    assert.deepEqual(s.sort, { col: 'role', dir: 'desc' });
    const firstCell = ctx.doc.querySelector('#table-body .row-data td:nth-child(2)').textContent;
    assert.equal(firstCell, 'lead', 'sort role:desc should put lead before dev');

    s = await command(ctx, bus, { type: 'jsonstudio:sort', col: null });
    assert.equal(s.sort, null);

    s = await command(ctx, bus, { type: 'jsonstudio:columns', hide: ['hours'] });
    assert.deepEqual(s.hidden, ['hours']);
    assert.equal(ctx.doc.querySelectorAll('#table-head th').length, 2);

    s = await command(ctx, bus, { type: 'jsonstudio:columns', hide: [] });
    assert.deepEqual(s.hidden, []);

    s = await command(ctx, bus, { type: 'jsonstudio:view', view: 'tree' });
    assert.equal(s.view, 'tree');
    assert.ok(shown(ctx, '#tree-area'));

    const before = bus.seen.length;
    ctx.win.postMessage({ type: 'something:else', view: 'pivot' }, '*');
    ctx.win.postMessage('a bare string', '*');
    ctx.win.postMessage({ type: 'jsonstudio:nonsense' }, '*');
    await wait(200);
    assert.equal(bus.seen.length, before, 'the embed answered a message that was not addressed to it');
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
  });
});

await it('tells the host which row the visitor clicked', async () => {
  await withEmbed('', async (ctx, bus) => {
    await load(ctx, bus, GROUPED);
    const rows = rowsOf(ctx);
    rows[2].click();
    const row = await until(() => bus.last('row'), { label: 'a row message' });
    assert.equal(row.group, 'Mobile');
    assert.equal(row.data.name, 'Bo');
    ctx.doc.querySelector('#modal-close').click();
  });
});

// ── The builder ─────────────────────────────────────────────────────────────
group('embed builder');

await it('drives its preview through the contract and writes a snippet that carries it', async () => {
  const ctx = await boot(BUILDER, { width: 1200, height: 900 });
  try {
    const preview = ctx.doc.querySelector('#preview-frame');
    await until(() => preview.contentDocument?.querySelectorAll('#table-body .row-data').length > 0,
      { label: 'the preview to render the sample data' });
    const snippet = ctx.doc.querySelector('#snippet').textContent;
    assert.includes(snippet, '<iframe');
    assert.includes(snippet, 'https://jsonstudio.neorgon.com/visualizer/embed.html');
    assert.includes(snippet, "'jsonstudio:load'");
    assert.includes(snippet, "e.data.type === 'ready'");
    assert.ok(!snippet.includes('https://jsonstudio.neorgon.com/visualizer/embed.html?'),
      'a default form should give a bare embed URL');

    const form = ctx.doc.querySelector('#builder-form');
    form.elements.view.value = 'pivot';
    form.elements.title.value = 'Hours per project';
    form.dispatchEvent(new ctx.win.Event('change', { bubbles: true }));
    await until(() => ctx.doc.querySelector('#snippet').textContent.includes('view=pivot'),
      { label: 'the snippet to pick up the new view' });
    assert.includes(ctx.doc.querySelector('#snippet').textContent, 'title=Hours+per+project');
    await until(() => preview.contentDocument?.querySelector('#embed-caption')?.textContent === 'Hours per project',
      { label: 'the preview to reload with the caption' });
    await until(() => preview.contentDocument?.querySelectorAll('#table-body .row-data').length > 0,
      { label: 'the reloaded preview to get its data again' });

    form.elements.json.value = '{"oops": ';
    form.dispatchEvent(new ctx.win.Event('input', { bubbles: true }));
    await until(() => ctx.doc.querySelector('#json-error').textContent.includes('Invalid JSON'),
      { label: 'the JSON error to show' });
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
  } finally { ctx.destroy(); }
});

// ── The full page, after the events split ───────────────────────────────────
group('visualizer page');

await it('still boots, loads a demo, and Reset returns to the input view cleanly', async () => {
  // Regression: the Reset handler looked up an id that exists nowhere in the
  // page, threw there, and left the toolbar and the session copy in place.
  sessionStorage.removeItem('viewer-session-json');
  const ctx = await boot(APP, { width: 1200, height: 800 });
  try {
    const demo = await until(() => ctx.doc.querySelector('.btn-example'), { label: 'the demo buttons' });
    demo.click();
    await until(() => rowsOf(ctx).length > 0, { label: 'the demo to render' });
    assert.ok(sessionStorage.getItem('viewer-session-json'), 'the full page should keep a session copy');
    ctx.doc.querySelector('#btn-reset').click();
    await wait(50);
    assert.equal(ctx.errors.length, 0, `console errors: ${ctx.errors.join(' | ')}`);
    assert.ok(shown(ctx, '#view-input'), 'Reset should return to the input view');
    assert.ok(!shown(ctx, '#btn-export-csv'), 'Reset left the CSV button on the input view');
    assert.equal(sessionStorage.getItem('viewer-session-json'), null, 'Reset left the session copy in place');
  } finally {
    ctx.destroy();
    sessionStorage.removeItem('viewer-session-json');
  }
});

finish();
