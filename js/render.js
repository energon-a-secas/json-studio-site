// ═══════════════════════════════════════════
//  DOM RENDERING
// ═══════════════════════════════════════════

import { state } from './state.js';
import {
  createNode,
  removeNode,
  addNodeAt,
  nodeToValue,
  highlightJSON
} from './utils.js';
import { makeDZ, makeEmptyDZ } from './events.js';

// ── JSON output ──

export function updateOutput() {
  const json = JSON.stringify(nodeToValue(state.root), null, 2);
  document.getElementById('json-output').innerHTML = highlightJSON(json);
  if (state.editMode) {
    document.getElementById('json-textarea').value = json;
  }
}

// ── Render a single node (recursive) ──

export function renderNode(node, parentId, isRoot) {
  isRoot = isRoot || false;
  const isContainer = node.type === 'object' || node.type === 'array';
  const parentNode  = (parentId != null) ? state.nodeMap[parentId] : null;

  const el = document.createElement('div');
  el.className = 'node' + (isRoot ? ' root-node' : '');
  el.dataset.nodeId = node.id;

  // ── block row ──
  const block = document.createElement('div');
  block.className = `node-block lb-${node.type}`;
  block.dataset.nodeId = String(node.id);
  if (!isRoot) block.setAttribute('tabindex', '0');

  // Drag handle (not for root)
  if (!isRoot) {
    const h = document.createElement('span');
    h.className = 'drag-handle';
    h.textContent = '\u283F';
    h.draggable = true;
    h.addEventListener('dragstart', e => {
      state.drag = { source: 'canvas', nodeId: node.id };
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => el.classList.add('dragging'), 0);
    });
    h.addEventListener('dragend', () => el.classList.remove('dragging'));
    block.appendChild(h);
  }

  // Collapse toggle
  if (isContainer) {
    const cb = document.createElement('button');
    cb.className = 'collapse-btn';
    cb.textContent = node.collapsed ? '\u25B6' : '\u25BC';
    cb.addEventListener('click', () => { node.collapsed = !node.collapsed; render(); });
    block.appendChild(cb);
  }

  // Type badge
  const badge = document.createElement('span');
  badge.className = `type-badge badge-${node.type}`;
  badge.textContent = node.type === 'boolean' ? 'bool' : node.type;
  block.appendChild(badge);

  // Key input (if parent is object)
  if (parentNode && parentNode.type === 'object') {
    const ki = document.createElement('input');
    ki.className = 'node-key-input';
    ki.value       = node.key || '';
    ki.placeholder = 'key';
    ki.addEventListener('input', e => { node.key = e.target.value; updateOutput(); });
    ki.addEventListener('dragstart', e => e.stopPropagation());
    block.appendChild(ki);

    const colon = document.createElement('span');
    colon.className = 'key-colon';
    colon.textContent = ':';
    block.appendChild(colon);
  }

  // Value editors
  if (node.type === 'string') {
    const inp = document.createElement('input');
    inp.className   = 'node-value-input str-val';
    inp.value       = node.value;
    inp.placeholder = 'string\u2026';
    inp.addEventListener('input', e => { node.value = e.target.value; updateOutput(); });
    inp.addEventListener('dragstart', e => e.stopPropagation());
    block.appendChild(inp);

  } else if (node.type === 'number') {
    const inp = document.createElement('input');
    inp.className   = 'node-value-input num-val';
    inp.type        = 'number';
    inp.value       = node.value;
    inp.placeholder = '0';
    inp.addEventListener('input', e => { node.value = parseFloat(e.target.value) || 0; updateOutput(); });
    inp.addEventListener('dragstart', e => e.stopPropagation());
    block.appendChild(inp);

  } else if (node.type === 'boolean') {
    const btn = document.createElement('button');
    btn.className = 'bool-toggle' + (node.value ? ' is-true' : '');
    btn.textContent = node.value ? 'true' : 'false';
    btn.addEventListener('click', () => {
      node.value = !node.value;
      btn.textContent = node.value ? 'true' : 'false';
      btn.classList.toggle('is-true', node.value);
      updateOutput();
    });
    block.appendChild(btn);

  } else if (node.type === 'null') {
    const lbl = document.createElement('span');
    lbl.className   = 'null-label';
    lbl.textContent = 'null';
    block.appendChild(lbl);

  } else if (isContainer) {
    const cs = document.createElement('span');
    cs.className = 'child-count';
    const n = node.children.length;
    if (node.collapsed) {
      const sym = node.type === 'object' ? ['{', '}'] : ['[', ']'];
      cs.textContent = `${sym[0]} ${n} ${node.type === 'object' ? (n===1?'prop':'props') : (n===1?'item':'items')} ${sym[1]}`;
    } else {
      cs.textContent = `${n} ${node.type === 'object' ? (n===1?'prop':'props') : (n===1?'item':'items')}`;
    }
    block.appendChild(cs);
  }

  // Spacer + delete
  const sp = document.createElement('span');
  sp.className = 'spacer';
  block.appendChild(sp);

  if (!isRoot) {
    const del = document.createElement('button');
    del.className   = 'delete-btn';
    del.textContent = '\u00D7';
    del.title       = 'Delete';
    del.addEventListener('click', () => { removeNode(node.id); render(); });
    block.appendChild(del);
  }

  el.appendChild(block);

  // ── children ──
  if (isContainer && !node.collapsed) {
    const ch = document.createElement('div');
    ch.className = 'node-children';

    if (node.children.length === 0) {
      ch.appendChild(makeEmptyDZ(node.id));
    } else {
      ch.appendChild(makeDZ(node.id, 0));
      node.children.forEach((child, i) => {
        ch.appendChild(renderNode(child, node.id, false));
        ch.appendChild(makeDZ(node.id, i + 1));
      });
    }

    // Add row
    const addRow = document.createElement('div');
    addRow.className = 'add-row';
    const chips = [
      { t:'object',  lbl:'{}' },
      { t:'array',   lbl:'[]' },
      { t:'string',  lbl:'"a"' },
      { t:'number',  lbl:'123' },
      { t:'boolean', lbl:'t/f' },
      { t:'null',    lbl:'\u2205' },
    ];
    chips.forEach(({ t, lbl }) => {
      const btn = document.createElement('button');
      btn.className   = `add-type-chip chip-${t}`;
      btn.textContent = lbl;
      btn.title       = `Add ${t}`;
      btn.addEventListener('click', () => {
        const n = createNode(t);
        addNodeAt(node.id, n);
        render();
      });
      addRow.appendChild(btn);
    });
    ch.appendChild(addRow);
    el.appendChild(ch);
  }

  return el;
}

// ── Full render ──

export function render() {
  const container = document.getElementById('tree-root');
  container.innerHTML = '';
  if (state.root) container.appendChild(renderNode(state.root, null, true));
  updateOutput();
  document.getElementById('btn-obj').classList.toggle('active', state.root && state.root.type === 'object');
  document.getElementById('btn-arr').classList.toggle('active', state.root && state.root.type === 'array');
}
