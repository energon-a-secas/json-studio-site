// ═══════════════════════════════════════════
//  EVENT HANDLERS, DRAG-AND-DROP, INLINE EDITING
// ═══════════════════════════════════════════

import { state } from './state.js';

// Start-from templates (good practice shapes for Visualizer)
const BUILD_TEMPLATES = [
  { label: 'Empty object', sub: '{}', value: {} },
  { label: 'Empty array', sub: '[]', value: [] },
  { label: 'Array of objects', sub: 'Flat list, 2 sample rows', value: [ { id: 1, name: '', value: 0 }, { id: 2, name: '', value: 0 } ] },
  { label: 'Grouped (e.g. projects → people)', sub: 'Visualizer pivot-friendly shape', value: { 'Project A': { people: [ { name: '', role: '', allocation: { '12m': { hours: 0, tasks: 0 }, '6m': { hours: 0, tasks: 0 } } } ] }, 'Project B': { people: [] } } },
];
import {
  createNode,
  addNodeAt,
  moveNode,
  removeNode,
  isDescendant,
  nodeToValue,
  jsonToTree
} from './utils.js';
import { render, updateOutput } from './render.js';

// ═══════════════════════════════════════════
//  DROP HANDLING
// ═══════════════════════════════════════════

function handleDrop(targetParentId, targetIndex) {
  if (!state.drag) return;
  if (state.drag.source === 'palette') {
    const node = createNode(state.drag.type);
    addNodeAt(targetParentId, node, targetIndex);
  } else if (state.drag.source === 'canvas') {
    const { nodeId } = state.drag;
    if (nodeId === targetParentId) { state.drag = null; return; }
    if (isDescendant(targetParentId, nodeId)) { state.drag = null; return; }
    moveNode(nodeId, targetParentId, targetIndex);
  }
  state.drag = null;
  document.getElementById('canvas-scroll')?.classList.remove('canvas-drag-from-palette');
  render();
}

// ═══════════════════════════════════════════
//  DROP ZONE FACTORIES
// ═══════════════════════════════════════════

export function makeDZ(parentId, index) {
  const dz = document.createElement('div');
  dz.className = 'drop-zone';
  dz.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dz-active'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dz-active'));
  dz.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dz-active'); handleDrop(parentId, index); });
  return dz;
}

export function makeEmptyDZ(parentId) {
  const dz = document.createElement('div');
  dz.className = 'empty-drop';
  dz.textContent = 'Drop a block here';
  dz.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('dz-active'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dz-active'));
  dz.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('dz-active'); handleDrop(parentId, 0); });
  return dz;
}

// ═══════════════════════════════════════════
//  LOAD FROM VALUE (import / edit apply)
// ═══════════════════════════════════════════

export function loadFromValue(value) {
  state.nodeMap   = {};
  state.idCounter = 0;
  if (Array.isArray(value)) {
    state.root = { id: 0, type: 'array', key: '', children: [], collapsed: false };
    state.nodeMap[0] = state.root;
    value.forEach(item => state.root.children.push(jsonToTree(item, '')));
  } else if (value !== null && typeof value === 'object') {
    state.root = { id: 0, type: 'object', key: '', children: [], collapsed: false };
    state.nodeMap[0] = state.root;
    Object.entries(value).forEach(([k, v]) => state.root.children.push(jsonToTree(v, k)));
  } else {
    // Primitive root — wrap in an object
    state.root = { id: 0, type: 'object', key: '', children: [], collapsed: false };
    state.nodeMap[0] = state.root;
    state.root.children.push(jsonToTree(value, 'value'));
  }
  render();
}

// ═══════════════════════════════════════════
//  EDIT MODE
// ═══════════════════════════════════════════

export function toggleEditMode() {
  state.editMode = !state.editMode;
  const viewEl   = document.getElementById('json-view');
  const editEl   = document.getElementById('json-edit');
  const footerEl = document.getElementById('json-edit-footer');
  const btn      = document.getElementById('edit-toggle-btn');

  if (state.editMode) {
    viewEl.style.display   = 'none';
    editEl.style.display   = 'flex';
    footerEl.style.display = 'flex';
    btn.classList.add('edit-active');
    btn.textContent = 'View';
    const ta = document.getElementById('json-textarea');
    ta.value = JSON.stringify(nodeToValue(state.root), null, 2);
    ta.classList.remove('has-error');
    document.getElementById('json-error').textContent = '';
    ta.focus();
  } else {
    viewEl.style.display   = '';
    editEl.style.display   = 'none';
    footerEl.style.display = 'none';
    btn.classList.remove('edit-active');
    btn.textContent = 'Edit';
  }
}

export function applyJSON() {
  const ta    = document.getElementById('json-textarea');
  const errEl = document.getElementById('json-error');
  try {
    const value = JSON.parse(ta.value);
    errEl.textContent = '';
    ta.classList.remove('has-error');
    loadFromValue(value);
    // Switch back to view mode after successful apply
    if (state.editMode) toggleEditMode();
  } catch (err) {
    errEl.textContent = '\u26A0 ' + err.message;
    ta.classList.add('has-error');
  }
}

// ═══════════════════════════════════════════
//  PUBLIC ACTIONS (called from inline onclick)
// ═══════════════════════════════════════════

export function setRootType(type) {
  if (!state.root || state.root.type === type) return;
  state.root.type = type;
  render();
}

export function clearCanvas() {
  const t = state.root ? state.root.type : 'object';
  state.nodeMap    = {};
  state.idCounter  = 0;
  state.root       = { id: 0, type: t, key: '', children: [], collapsed: false };
  state.nodeMap[0] = state.root;
  render();
}

export function copyJSON() {
  const json = JSON.stringify(nodeToValue(state.root), null, 2);
  navigator.clipboard.writeText(json).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = json;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

export function downloadJSON() {
  const json = JSON.stringify(nodeToValue(state.root), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'data.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Serialize current tree to JSON, store in sessionStorage, and navigate to Visualizer. */
export function openInViewer() {
  const json = JSON.stringify(nodeToValue(state.root), null, 2);
  try {
    sessionStorage.setItem('viewer-import', json);
    window.location.href = 'visualizer/';
  } catch (e) {
    alert('Could not open in Visualizer: ' + (e.message || 'storage failed'));
  }
}

export function triggerImport() {
  document.getElementById('file-import').click();
}

export function toggleTemplates() {
  const dropdown = document.getElementById('templates-dropdown');
  if (!dropdown) return;
  if (dropdown.classList.contains('hidden-el')) {
    dropdown.innerHTML = '';
    BUILD_TEMPLATES.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'template-item';
      btn.dataset.index = String(i);
      btn.innerHTML = `${t.label}<span class="template-sub">${t.sub}</span>`;
      btn.addEventListener('click', () => {
        loadFromValue(t.value);
        dropdown.classList.add('hidden-el');
      });
      dropdown.appendChild(btn);
    });
    dropdown.classList.remove('hidden-el');
  } else {
    dropdown.classList.add('hidden-el');
  }
}

function closeTemplatesOnClickOutside(e) {
  const wrap = document.querySelector('.templates-wrap');
  if (wrap && !wrap.contains(e.target)) document.getElementById('templates-dropdown')?.classList.add('hidden-el');
}

export function toggleJSONPanel() {
  document.querySelector('.json-panel').classList.toggle('panel-open');
  _syncToggleBtn();
}

function _syncToggleBtn() {
  const btn = document.getElementById('json-toggle-btn');
  if (!btn) return;
  btn.textContent = document.querySelector('.json-panel').classList.contains('panel-open') ? 'Hide JSON' : 'Show JSON';
}

// ═══════════════════════════════════════════
//  SETUP (called once from app.js)
// ═══════════════════════════════════════════

export function setupEvents() {
  const canvasScroll = document.getElementById('canvas-scroll');

  // Palette drag: show drop affordance on canvas
  document.querySelectorAll('.palette-block').forEach(block => {
    block.addEventListener('dragstart', e => {
      state.drag = { source: 'palette', type: block.dataset.type };
      e.dataTransfer.effectAllowed = 'copy';
      canvasScroll?.classList.add('canvas-drag-from-palette');
    });
    block.addEventListener('dragend', () => {
      state.drag = null;
      canvasScroll?.classList.remove('canvas-drag-from-palette');
    });
  });

  // File import handler
  document.getElementById('file-import').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const value = JSON.parse(evt.target.result);
        if (state.editMode) toggleEditMode(); // exit edit mode first
        loadFromValue(value);
      } catch (err) {
        alert('Invalid JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // allow re-importing same file
  });

  // Prevent canvas from blocking drops at the top level
  document.getElementById('canvas-scroll').addEventListener('dragover', e => e.preventDefault());

  // Keyboard: Delete node, Expand/Collapse all, Copy node as JSON
  document.addEventListener('keydown', (e) => {
    const inInput = e.target.matches('input, textarea');
    const nodeEl = e.target.closest('.node');
    const nodeId = nodeEl ? parseInt(nodeEl.dataset.nodeId, 10) : null;
    const node = nodeId != null ? state.nodeMap[nodeId] : null;

    // Expand all (Ctrl+Shift+E)
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      Object.values(state.nodeMap).forEach(n => { if (n.children) n.collapsed = false; });
      render();
      return;
    }
    // Collapse all (Ctrl+Shift+C)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      Object.values(state.nodeMap).forEach(n => { if (n.children) n.collapsed = true; });
      render();
      return;
    }
    // Copy node as JSON (Ctrl+Shift+J)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      if (node && nodeId !== 0) {
        const json = JSON.stringify(nodeToValue(node), null, 2);
        navigator.clipboard.writeText(json).catch(() => {});
      }
      return;
    }
    // Delete node (Delete key, only when not in input)
    if (e.key === 'Delete' && !inInput && node && nodeId !== 0) {
      e.preventDefault();
      const hasChildren = node.children && node.children.length > 0;
      if (hasChildren && !confirm(`Delete this node and its ${node.children.length} child${node.children.length === 1 ? '' : 'ren'}?`)) return;
      removeNode(nodeId);
      render();
    }
  });

  // Expose needed functions on window for inline onclick handlers
  window.setRootType     = setRootType;
  window.triggerImport   = triggerImport;
  window.clearCanvas     = clearCanvas;
  window.toggleJSONPanel = toggleJSONPanel;
  window.toggleEditMode  = toggleEditMode;
  window.copyJSON        = copyJSON;
  window.downloadJSON    = downloadJSON;
  window.applyJSON       = applyJSON;
  window.openInViewer    = openInViewer;
  window.toggleTemplates = toggleTemplates;

  document.addEventListener('click', closeTemplatesOnClickOutside);
}
