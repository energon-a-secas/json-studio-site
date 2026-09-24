// embed.html carries a copy of index.html's viewer block, because the viewer
// modules find their elements by id. An id added to one page and not the other
// is a null lookup that throws on the first click nobody made in testing. This
// pins the two blocks to each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'visualizer');
const page = readFileSync(join(root, 'index.html'), 'utf8');
const embed = readFileSync(join(root, 'embed.html'), 'utf8');

function block(src, from, to) {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a);
  assert.ok(a !== -1 && b !== -1, `marker missing: ${from} / ${to}`);
  return src.slice(a, b);
}
const ids = html => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

// The two controls that return to the input view have no meaning in an embed.
const NOT_IN_EMBED = new Set(['btn-reset']);

test('every viewer id on the full page exists in the embed', () => {
  const viewer = block(page, '<!-- ── Viewer View ── -->', '<script type="module"');
  const missing = ids(viewer).filter(id => !NOT_IN_EMBED.has(id) && !embed.includes(`id="${id}"`));
  assert.deepEqual(missing, []);
});

test('the embed adds only its own shell ids', () => {
  const own = new Set(['embed-caption', 'error-msg', 'embed-empty', 'embed-foot-count']);
  const viewer = block(page, '<!-- ── Viewer View ── -->', '<script type="module"');
  const pageIds = new Set(ids(viewer));
  const extra = ids(embed).filter(id => !pageIds.has(id) && !own.has(id));
  assert.deepEqual(extra, []);
});

test('the embed page names no third-party host anywhere in its head', () => {
  const head = block(embed, '<head>', '</head>');
  assert.equal((head.match(/https?:\/\//g) || []).length, 0, 'a URL with a scheme in the embed head');
  assert.match(head, /connect-src 'none'/);
  assert.match(head, /name="robots" content="noindex/);
});

test('no id the viewer modules look up is absent from both pages', () => {
  // $('some-id') calls in the modules the embed loads. Optional-chained lookups
  // are allowed to miss; plain ones are not.
  const modules = ['state.js', 'load.js', 'events.js', 'table.js', 'filter.js', 'pivot.js', 'tree.js', 'modal.js', 'stats.js', 'export.js', 'embed.js'];
  const hard = new Set();
  for (const m of modules) {
    const src = readFileSync(join(root, 'js', m), 'utf8');
    for (const match of src.matchAll(/\$\('([\w-]+)'\)(\??)/g)) {
      if (match[2] !== '?') hard.add(match[1]);
    }
  }
  // Looked up only inside the input half of events.js and load.js' input-view guard.
  const inputOnly = new Set(['example-buttons', 'btn-load', 'json-input', 'btn-new-json', 'file-input', 'drop-zone', 'view-input', 'btn-reset', 'pivot-hint']);
  const missing = [...hard].filter(id => !inputOnly.has(id) && !embed.includes(`id="${id}"`));
  assert.deepEqual(missing, []);
});
