import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEmbedParams, buildEmbedQuery, parseSort } from '../visualizer/js/embed-params.js';

test('a bare URL is the default embed', () => {
  assert.deepEqual(parseEmbedParams(''), {
    view: 'table', title: '', toolbar: true, stats: true, fit: 'box',
    hide: [], sort: null, pivot: null, chart: false, bg: null,
  });
});

test('every setting parses', () => {
  const o = parseEmbedParams('?view=pivot&title=Hours&toolbar=off&stats=0&fit=content&hide=email,%20id&sort=hours:desc&pivot=Ada,h&chart=timeline&bg=%230B1120');
  assert.deepEqual(o, {
    view: 'pivot', title: 'Hours', toolbar: false, stats: false, fit: 'content',
    hide: ['email', 'id'], sort: { col: 'hours', dir: 'desc' },
    pivot: { user: 'Ada', metric: 'h' }, chart: true, bg: '#0b1120',
  });
});

test('unknown or malformed values fall back rather than throw', () => {
  const o = parseEmbedParams('?view=chart&fit=huge&bg=red&sort=&pivot=&title=off&toolbar=on');
  assert.equal(o.view, 'table');
  assert.equal(o.fit, 'box');
  assert.equal(o.bg, null);
  assert.equal(o.sort, null);
  assert.equal(o.pivot, null);
  assert.equal(o.title, '');
  assert.equal(o.toolbar, true);
});

test('pivot keeps a blank user or metric', () => {
  assert.deepEqual(parseEmbedParams('?pivot=,h').pivot, { user: null, metric: 'h' });
  assert.deepEqual(parseEmbedParams('?pivot=Ada').pivot, { user: 'Ada', metric: null });
});

test('sort treats only an exact asc or desc suffix as a direction', () => {
  assert.deepEqual(parseSort('hours'), { col: 'hours', dir: 'asc' });
  assert.deepEqual(parseSort('hours:DESC'), { col: 'hours', dir: 'desc' });
  assert.deepEqual(parseSort('a:b'), { col: 'a:b', dir: 'asc' });
  assert.deepEqual(parseSort('a:b:desc'), { col: 'a:b', dir: 'desc' });
  assert.equal(parseSort(':desc'), null);
  assert.equal(parseSort(''), null);
});

test('buildEmbedQuery writes only what differs from the defaults', () => {
  assert.equal(buildEmbedQuery({ view: 'table', toolbar: true, stats: true, fit: 'box', hide: [], sort: null }), '');
  assert.equal(buildEmbedQuery({ view: 'tree', toolbar: false, bg: '#0B1120' }), 'view=tree&toolbar=off&bg=0B1120');
});

test('build and parse round-trip', () => {
  const o = {
    view: 'pivot', title: 'Hours per project', toolbar: false, stats: false, fit: 'content',
    hide: ['email', 'id'], sort: { col: 'hours', dir: 'desc' },
    pivot: { user: 'Ada', metric: null }, chart: true, bg: '#0b1120',
  };
  assert.deepEqual(parseEmbedParams('?' + buildEmbedQuery(o)), o);
});
