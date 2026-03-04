// ═══════════════════════════════════════════
//  SMALL SHARED HELPERS
// ═══════════════════════════════════════════

import { state } from './state.js';

// ── Node creation ──

export function createNode(type) {
  const id   = ++state.idCounter;
  const node = { id, type, key: '', collapsed: false };
  if (type === 'object' || type === 'array') {
    node.children = [];
  } else if (type === 'string') {
    node.value = '';
  } else if (type === 'number') {
    node.value = 0;
  } else if (type === 'boolean') {
    node.value = false;
  } else {
    node.value = null; // null type
  }
  state.nodeMap[id] = node;
  return node;
}

// ── Tree traversal helpers ──

export function findParent(targetId, node) {
  node = node || state.root;
  if (!node.children) return null;
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].id === targetId) return { parent: node, index: i };
    const found = findParent(targetId, node.children[i]);
    if (found) return found;
  }
  return null;
}

export function isDescendant(nodeId, ancestorId) {
  const anc = state.nodeMap[ancestorId];
  if (!anc || !anc.children) return false;
  for (const c of anc.children) {
    if (c.id === nodeId) return true;
    if (isDescendant(nodeId, c.id)) return true;
  }
  return false;
}

export function cleanNodeMap(n) {
  delete state.nodeMap[n.id];
  if (n.children) n.children.forEach(cleanNodeMap);
}

// ── Tree mutation helpers ──

export function removeNode(nodeId) {
  const r = findParent(nodeId);
  if (r) {
    cleanNodeMap(state.nodeMap[nodeId]);
    r.parent.children.splice(r.index, 1);
  }
}

export function addNodeAt(parentId, node, index) {
  const p = state.nodeMap[parentId];
  if (!p || !p.children) return;
  if (index == null || index >= p.children.length) {
    p.children.push(node);
  } else {
    p.children.splice(Math.max(0, index), 0, node);
  }
}

export function moveNode(nodeId, targetParentId, targetIndex) {
  if (nodeId === 0) return;
  if (nodeId === targetParentId) return;
  if (isDescendant(targetParentId, nodeId)) return;

  const node = state.nodeMap[nodeId];
  if (!node) return;

  const r = findParent(nodeId);
  if (!r) return;

  let idx = targetIndex;
  if (r.parent.id === targetParentId && r.index < targetIndex) idx--;

  r.parent.children.splice(r.index, 1);

  const tp = state.nodeMap[targetParentId];
  if (!tp || !tp.children) return;

  idx = Math.max(0, Math.min(idx, tp.children.length));
  tp.children.splice(idx, 0, node);
}

// ── JSON generation ──

export function nodeToValue(node) {
  if (node.type === 'object') {
    const obj = {};
    node.children.forEach(c => {
      const k = (c.key && c.key.trim()) ? c.key.trim() : `field${c.id}`;
      obj[k] = nodeToValue(c);
    });
    return obj;
  }
  if (node.type === 'array')   return node.children.map(nodeToValue);
  if (node.type === 'string')  return String(node.value);
  if (node.type === 'number')  return isNaN(parseFloat(node.value)) ? 0 : parseFloat(node.value);
  if (node.type === 'boolean') return Boolean(node.value);
  return null;
}

export function highlightJSON(str) {
  // Escape HTML first
  str = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return str.replace(
    /("(?:\\.|[^"\\])*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}\[\],:])/g,
    m => {
      if (m === '{' || m === '}' || m === '[' || m === ']' || m === ',' || m === ':')
        return `<span class="jp">${m}</span>`;
      if (/^".*:$/.test(m)) return `<span class="jk">${m}</span>`;
      if (/^"/.test(m))     return `<span class="js">${m}</span>`;
      if (m==='true'||m==='false') return `<span class="jb">${m}</span>`;
      if (m==='null')       return `<span class="jnu">${m}</span>`;
      return `<span class="jn">${m}</span>`;
    }
  );
}

// ── JSON → Tree (import / edit) ──

export function jsonToTree(value, key) {
  key = (key === undefined) ? '' : key;
  if (value === null) {
    const n = createNode('null'); n.key = key; return n;
  }
  if (typeof value === 'boolean') {
    const n = createNode('boolean'); n.value = value; n.key = key; return n;
  }
  if (typeof value === 'number') {
    const n = createNode('number'); n.value = value; n.key = key; return n;
  }
  if (typeof value === 'string') {
    const n = createNode('string'); n.value = value; n.key = key; return n;
  }
  if (Array.isArray(value)) {
    const n = createNode('array'); n.key = key;
    value.forEach(item => n.children.push(jsonToTree(item, '')));
    return n;
  }
  if (typeof value === 'object') {
    const n = createNode('object'); n.key = key;
    Object.entries(value).forEach(([k, v]) => n.children.push(jsonToTree(v, k)));
    return n;
  }
  const n = createNode('null'); n.key = key; return n;
}
