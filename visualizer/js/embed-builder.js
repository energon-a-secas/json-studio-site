// ─────────────────────────────────────────────────────────────
// The embed builder: a form that writes the iframe snippet.
//
// A documented contract with no builder gets copied wrong once and then
// avoided; this page configures a live preview and hands over the finished
// snippet. The preview is driven exactly the way a host page would drive it,
// so if it works here the snippet works there.
// ─────────────────────────────────────────────────────────────
import { DEMOS } from './demos.js';
import { $, escHtml } from './utils.js';
import { buildEmbedQuery, parseSort } from './embed-params.js';

const ORIGIN = 'https://jsonstudio.neorgon.com';
const form = $('builder-form');
const frame = $('preview-frame');
const snippet = $('snippet');
const eventLog = $('event-log');

// The sample picker is the Visualizer's own demo list, so a new demo appears
// here without anyone remembering to add it.
$('f-demo').innerHTML = DEMOS
  .map((d, i) => `<option value="${i}">${escHtml(d.label)}: ${escHtml(d.sub)}</option>`)
  .join('');
const preferred = DEMOS.findIndex(d => /pivot/i.test(d.sub));
$('f-demo').value = String(preferred === -1 ? 0 : preferred);

const val = name => (form.elements[name]?.value ?? '').trim();
const checked = name => Boolean(form.elements[name]?.checked);

function currentData() {
  const raw = val('json');
  if (raw) {
    try { return { data: JSON.parse(raw), error: null }; }
    catch (e) { return { data: null, error: e.message }; }
  }
  const demo = DEMOS[Number(val('demo'))] || DEMOS[0];
  return { data: demo.data, error: null };
}

function options() {
  return {
    view: val('view'),
    title: val('title'),
    hide: val('hide').split(',').map(s => s.trim()).filter(Boolean),
    sort: parseSort(val('sort')),
    toolbar: checked('toolbar'),
    stats: checked('stats'),
    chart: checked('chart'),
    fit: checked('fit') ? 'content' : 'box',
    bg: val('bg'),
  };
}

function embedUrl(absolute) {
  const base = absolute ? `${ORIGIN}/visualizer/embed.html` : 'embed.html';
  const q = buildEmbedQuery(options());
  return q ? `${base}?${q}` : base;
}

// ── The preview, driven like a host page ────────────────────
let handshakeDone = false;
let lastUrl = frame.getAttribute('src');

function send(message) {
  frame.contentWindow?.postMessage(message, location.origin);
  log(`sent  ${JSON.stringify(message)}`);
}

function sendData() {
  const { data } = currentData();
  if (data) send({ type: 'jsonstudio:load', data });
}

// ready may arrive before this module attached its listener (the frame and this
// script load in parallel), so the frame's load event is the second chance.
// Either one completes the handshake; the other is then a no-op.
function handshake() {
  if (handshakeDone) return;
  handshakeDone = true;
  sendData();
}
frame.addEventListener('load', handshake);

function log(line) {
  const time = new Date().toLocaleTimeString();
  const short = line.length > 240 ? line.slice(0, 240) + '…' : line;
  eventLog.textContent = `${time}  ${short}\n${eventLog.textContent}`.split('\n').slice(0, 12).join('\n');
}

window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.data || e.data.source !== 'jsonstudio') return;
  log(`recv  ${JSON.stringify(e.data)}`);
  if (e.data.type === 'ready') handshake();
  if (e.data.type === 'height' && checked('fit')) frame.style.height = `${e.data.px}px`;
  if (e.data.type === 'loaded') {
    // Two demo buttons name a real column of whatever is loaded.
    const numeric = e.data.columns.find(c => c.type === 'number');
    $('api-sort').dataset.send = JSON.stringify({ type: 'jsonstudio:sort', col: numeric ? numeric.name : null, dir: 'desc' });
    $('api-sort').disabled = !numeric;
    const first = e.data.columns[0];
    $('api-hide').dataset.send = JSON.stringify({ type: 'jsonstudio:columns', hide: first ? [first.name] : [] });
  }
});

// ── The snippet ─────────────────────────────────────────────
function writeSnippet() {
  const height = val('height') || '480';
  const title = (val('title') || 'JSON table').replace(/"/g, '&quot;');
  const { data } = currentData();
  // A "</script>" inside a string value would end the host's script block, so
  // every "<" in the literal is escaped. JSON.parse and JS both read it back.
  const literal = JSON.stringify(data ?? [], null, 2).replace(/</g, '\\u003c').replace(/\n/g, '\n  ');
  const sizing = checked('fit')
    ? `\n    if (e.data.type === 'height') frame.style.height = e.data.px + 'px';`
    : '';
  snippet.textContent =
`<iframe id="json-studio" src="${embedUrl(true)}"
        title="${title}" width="100%" height="${height}"
        style="border:0;border-radius:12px" loading="lazy"></iframe>
<script>
(function () {
  var origin = '${ORIGIN}';
  var frame = document.getElementById('json-studio');
  var data = ${literal};
  var sent = false;
  function send() {
    if (sent) return;
    sent = true;
    frame.contentWindow.postMessage({ type: 'jsonstudio:load', data: data }, origin);
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== origin || !e.data || e.data.source !== 'jsonstudio') return;
    if (e.data.type === 'ready') send();${sizing}
  });
  frame.addEventListener('load', send);
})();
</script>`;
}

function update() {
  const { error } = currentData();
  $('json-error').textContent = error ? `Invalid JSON: ${error}` : '';
  const url = embedUrl(false);
  if (url !== lastUrl) {
    lastUrl = url;
    handshakeDone = false;
    frame.src = url;
  } else if (handshakeDone) {
    sendData();
  }
  if (!checked('fit')) frame.style.height = `${val('height') || '480'}px`;
  writeSnippet();
}

form.addEventListener('input', update);
form.addEventListener('change', update);

$('copy').addEventListener('click', () => {
  navigator.clipboard.writeText(snippet.textContent).then(() => {
    const btn = $('copy');
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy the snippet'; }, 1800);
  });
});

$('api-buttons').addEventListener('click', e => {
  const btn = e.target.closest('[data-send]');
  if (btn && !btn.disabled) send(JSON.parse(btn.dataset.send));
});

frame.style.height = `${val('height') || '480'}px`;
writeSnippet();
