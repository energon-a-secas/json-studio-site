// ─────────────────────────────────────────────────────────────
// Org Tree View — Hierarchical relationship visualization
// ─────────────────────────────────────────────────────────────
import { $, escHtml, fmt } from './utils.js';
import { state } from './state.js';
import { buildFilterBar } from './filter.js';

// ─────────────────────────────────────────────────────────────
// Auto-detect hierarchical relationships
// ─────────────────────────────────────────────────────────────
export function detectHierarchy(records) {
  if (!records || records.length === 0) return null;

  // Extract all field names from the first few records
  const sample = records.slice(0, Math.min(10, records.length));
  const allFields = new Set();
  sample.forEach(rec => {
    if (typeof rec === 'object' && rec !== null) {
      Object.keys(rec).forEach(k => allFields.add(k));
    }
  });

  // Find potential identifier fields (name, id, email, etc.)
  const idCandidates = [...allFields].filter(f =>
    /^(name|title|id|email|username|user|identifier|key)$/i.test(f)
  );

  // Find potential parent reference fields (reports_to, manager, parent, etc.)
  const refCandidates = [...allFields].filter(f =>
    /report|manager|parent|supervisor|lead|boss/i.test(f)
  );

  if (idCandidates.length === 0 || refCandidates.length === 0) return null;

  // Pick the best identifier field (prefer "name" if exists)
  const idField = idCandidates.find(f => /^name$/i.test(f)) || idCandidates[0];

  // Pick the best reference field
  const refField = refCandidates[0];

  // Validate: check if reference field values actually match identifier field values
  const idValues = new Set(records.map(r => r[idField]).filter(Boolean));
  const refValues = records.map(r => r[refField]).filter(Boolean);
  const matchCount = refValues.filter(v => idValues.has(v)).length;

  // At least 30% of references should match identifiers
  if (refValues.length > 0 && matchCount / refValues.length < 0.3) return null;

  return { idField, refField };
}

// ─────────────────────────────────────────────────────────────
// Build tree structure from flat records
// ─────────────────────────────────────────────────────────────
export function buildTree(records, idField, refField) {
  // Build lookup map and add indices
  const byId = new Map();
  const children = new Map();
  const visited = new Set();

  records.forEach((rec, idx) => {
    const id = rec[idField];
    if (id) {
      rec._treeIndex = idx; // Store index for modal lookup
      byId.set(id, rec);
      children.set(id, []);
    }
  });

  // Build parent-child relationships
  const roots = [];
  records.forEach(rec => {
    const id = rec[idField];
    const parentId = rec[refField];

    if (!id) return; // Skip records without identifier

    if (!parentId || !byId.has(parentId)) {
      // No parent or parent not found → root node
      roots.push(rec);
    } else if (parentId === id) {
      // Self-reference → treat as root
      roots.push(rec);
    } else {
      // Add to parent's children
      children.get(parentId).push(rec);
    }
  });

  // Detect cycles using DFS
  function hasCycle(id, path = new Set()) {
    if (path.has(id)) return true;
    path.add(id);
    const kids = children.get(id) || [];
    for (const kid of kids) {
      if (hasCycle(kid[idField], new Set(path))) return true;
    }
    return false;
  }

  // Filter out nodes that are part of cycles
  const validRoots = roots.filter(r => !hasCycle(r[idField]));

  return { roots: validRoots, children, byId, idField };
}

// ─────────────────────────────────────────────────────────────
// Render tree node (recursive)
// ─────────────────────────────────────────────────────────────
function renderNode(record, treeData, depth = 0, path = new Set()) {
  const { children, idField } = treeData;
  const id = record[idField];

  // Prevent infinite recursion from cycles
  if (path.has(id)) {
    return `<div class="tree-node" style="padding-left:${depth * 24}px">
      <span class="tree-icon">⚠️</span>
      <span class="tree-label" style="color: var(--warning)">${escHtml(String(id))} (circular reference)</span>
    </div>`;
  }

  const newPath = new Set(path);
  newPath.add(id);

  const kids = children.get(id) || [];
  const hasChildren = kids.length > 0;
  const nodeId = `tree-node-${depth}-${id}`;

  let html = `<div class="tree-node" style="padding-left:${depth * 24}px" data-depth="${depth}">`;

  // Expand/collapse icon
  if (hasChildren) {
    html += `<button class="tree-toggle" data-node-id="${escHtml(nodeId)}" aria-expanded="true" aria-label="Toggle">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>`;
  } else {
    html += `<span class="tree-spacer"></span>`;
  }

  // Node label (clickable to open modal)
  const label = String(record[idField] || '(unnamed)');
  html += `<button class="tree-label" data-record-idx="${escHtml(String(record._treeIndex))}">${escHtml(label)}`;

  // Child count badge
  if (hasChildren) {
    html += ` <span class="tree-count">${kids.length}</span>`;
  }

  html += `</button></div>`;

  // Children container
  if (hasChildren) {
    html += `<div class="tree-children" id="${escHtml(nodeId)}">`;
    kids.forEach(kid => {
      html += renderNode(kid, treeData, depth + 1, newPath);
    });
    html += `</div>`;
  }

  return html;
}

// ─────────────────────────────────────────────────────────────
// Activate tree mode
// ─────────────────────────────────────────────────────────────
export function activateTreeMode() {
  const allRecords = state.structure?.groups?.flatMap(g => g.rows) || [];
  if (!allRecords || allRecords.length === 0) return;

  // Apply column filters (same as table view)
  const hasFilters = Object.values(state.colFilters).some(s => s.size > 0);
  let records = allRecords;

  if (hasFilters) {
    records = allRecords.filter(row => {
      for (const [col, vals] of Object.entries(state.colFilters)) {
        if (vals.size === 0) continue;
        if (!vals.has(String(row[col] ?? ''))) return false;
      }
      return true;
    });
  }

  if (records.length === 0) {
    const treeArea = $('tree-area');
    treeArea.innerHTML = `<div class="tree-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>No records match the current filters</div>
      <div class="tree-empty-hint">Clear filters to see all records.</div>
    </div>`;
    treeArea.classList.remove('hidden-el');
    $('data-table').classList.add('hidden-el');
    $('stats-sidebar').classList.add('hidden-el');
    $('filter-bar').classList.add('hidden-el');

    // Enable tree scrolling mode
    $('table-area').classList.add('tree-mode');

    // Switch toolbar to tree mode
    $('toolbar-search-table')?.classList.add('hidden-el');
    $('toolbar-search-tree')?.classList.remove('hidden-el');
    $('toolbar-viz')?.classList.add('hidden-el');
    $('toolbar-table')?.classList.add('hidden-el');
    $('toolbar-tree-actions')?.classList.remove('hidden-el');

    state.treeActive = true;
    $('btn-tree').classList.add('active');
    return;
  }

  // Detect hierarchy
  const hierarchy = detectHierarchy(records);
  if (!hierarchy) {
    const treeArea = $('tree-area');
    treeArea.innerHTML = `<div class="tree-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>No hierarchical relationships detected</div>
      <div class="tree-empty-hint">Looking for fields like "Reports To", "Manager", "Parent" that reference other records by name or ID.</div>
    </div>`;
    treeArea.classList.remove('hidden-el');
    $('data-table').classList.add('hidden-el');
    $('stats-sidebar').classList.add('hidden-el');
    $('filter-bar').classList.add('hidden-el');

    // Enable tree scrolling mode
    $('table-area').classList.add('tree-mode');

    // Switch toolbar to tree mode
    $('toolbar-search-table')?.classList.add('hidden-el');
    $('toolbar-search-tree')?.classList.remove('hidden-el');
    $('toolbar-viz')?.classList.add('hidden-el');
    $('toolbar-table')?.classList.add('hidden-el');
    $('toolbar-tree-actions')?.classList.remove('hidden-el');

    state.treeActive = true;
    $('btn-tree').classList.add('active');
    return;
  }

  // Build tree structure
  const treeData = buildTree(records, hierarchy.idField, hierarchy.refField);

  if (treeData.roots.length === 0) {
    const treeArea = $('tree-area');
    treeArea.innerHTML = `<div class="tree-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div>No root nodes found</div>
      <div class="tree-empty-hint">All records reference other records, creating a cycle. Check your "${escHtml(hierarchy.refField)}" values.</div>
    </div>`;
    treeArea.classList.remove('hidden-el');
    $('data-table').classList.add('hidden-el');
    $('stats-sidebar').classList.add('hidden-el');
    $('filter-bar').classList.add('hidden-el');

    // Enable tree scrolling mode
    $('table-area').classList.add('tree-mode');

    // Switch toolbar to tree mode
    $('toolbar-search-table')?.classList.add('hidden-el');
    $('toolbar-search-tree')?.classList.remove('hidden-el');
    $('toolbar-viz')?.classList.add('hidden-el');
    $('toolbar-table')?.classList.add('hidden-el');
    $('toolbar-tree-actions')?.classList.remove('hidden-el');

    state.treeActive = true;
    $('btn-tree').classList.add('active');
    return;
  }

  // Store tree data in state for event handlers
  state.treeData = treeData;
  state.treeHierarchy = hierarchy;

  // Render tree (only title and metadata, controls moved to main toolbar)
  const filterInfo = hasFilters ? ` (${records.length} of ${allRecords.length} after filters)` : '';
  let html = `<div class="tree-header">
    <div class="tree-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2v6m0 0a3 3 0 100 6 3 3 0 000-6zm0 0V2m0 14v6m-8-6a3 3 0 106 0 3 3 0 00-6 0zm8 0a3 3 0 106 0 3 3 0 00-6 0z"/>
      </svg>
      Organization Tree
    </div>
    <div class="tree-meta">${treeData.roots.length} root${treeData.roots.length !== 1 ? 's' : ''} · ${records.length} records${filterInfo} · by ${escHtml(hierarchy.refField)} → ${escHtml(hierarchy.idField)}</div>
  </div>`;

  html += `<div class="tree-container">`;
  treeData.roots.forEach(root => {
    html += renderNode(root, treeData);
  });
  html += `</div>`;

  const treeArea = $('tree-area');
  treeArea.innerHTML = html;
  treeArea.classList.remove('hidden-el');

  // Hide table and stats
  $('data-table').classList.add('hidden-el');
  $('stats-sidebar').classList.add('hidden-el');
  $('filter-bar').classList.add('hidden-el');

  // Enable tree scrolling mode
  $('table-area').classList.add('tree-mode');

  // Switch toolbar to tree mode
  $('toolbar-search-table')?.classList.add('hidden-el');
  $('toolbar-search-tree')?.classList.remove('hidden-el');
  $('toolbar-viz')?.classList.add('hidden-el');
  $('toolbar-table')?.classList.add('hidden-el');
  $('toolbar-tree-actions')?.classList.remove('hidden-el');

  // Wire up tree event handlers
  attachTreeEvents();

  state.treeActive = true;
  $('btn-tree').classList.add('active');
}

// ─────────────────────────────────────────────────────────────
// Deactivate tree mode
// ─────────────────────────────────────────────────────────────
export function deactivateTreeMode() {
  $('tree-area').classList.add('hidden-el');
  $('data-table').classList.remove('hidden-el');
  $('stats-sidebar').classList.remove('hidden-el');

  // Disable tree scrolling mode
  $('table-area').classList.remove('tree-mode');

  // Switch toolbar back to table mode
  $('toolbar-search-table')?.classList.remove('hidden-el');
  $('toolbar-search-tree')?.classList.add('hidden-el');
  $('toolbar-viz')?.classList.remove('hidden-el');
  $('toolbar-table')?.classList.remove('hidden-el');
  $('toolbar-tree-actions')?.classList.add('hidden-el');

  $('btn-tree').classList.remove('active');

  state.treeActive = false;
  state.treeData = null;
  state.treeHierarchy = null;

  // Rebuild filter bar to show it again (if applicable)
  buildFilterBar();
}

// ─────────────────────────────────────────────────────────────
// Open modal from record data (simplified version for tree view)
// ─────────────────────────────────────────────────────────────
function openRecordModalFromData(record) {
  const { columns } = state.structure;
  const { idField } = state.treeHierarchy;

  // Title: use the identifier field value
  const title = String(record[idField] || 'Record Detail');
  $('modal-title').textContent = title;

  // Body: key-value table
  let bodyHtml = '<table class="modal-table"><tbody>';
  for (const col of columns) {
    const val = record[col.name];
    let displayVal = '';
    if (val === undefined || val === null) {
      displayVal = '\u2014';
    } else if (typeof val === 'object') {
      displayVal = JSON.stringify(val);
    } else if (col.type === 'number') {
      displayVal = fmt(val);
    } else {
      displayVal = escHtml(String(val));
    }
    bodyHtml += `<tr><td class="kv-key">${escHtml(col.name)}</td>` +
      `<td class="${col.type === 'number' ? 'col-num' : ''}">${displayVal}</td></tr>`;
  }
  bodyHtml += '</tbody></table>';
  $('modal-body').innerHTML = bodyHtml;

  // Hide footer for tree view modals
  $('modal-footer').classList.add('hidden-el');
  document.querySelector('.modal-box').classList.remove('modal-wide');

  // Show modal
  $('record-modal').classList.remove('hidden-el');
}

// ─────────────────────────────────────────────────────────────
// Filter tree nodes by search term
// ─────────────────────────────────────────────────────────────
function filterTreeNodes(searchTerm) {
  const allRecords = state.structure?.groups?.flatMap(g => g.rows) || [];
  const term = searchTerm.toLowerCase().trim();

  // If no search term, show all nodes
  if (!term) {
    document.querySelectorAll('.tree-node, .tree-children').forEach(el => {
      el.classList.remove('tree-hidden', 'tree-match');
    });
    return;
  }

  // Find matching record indices
  const matchingIndices = new Set();
  allRecords.forEach((record, idx) => {
    const values = Object.values(record).map(v => String(v || '').toLowerCase());
    if (values.some(v => v.includes(term))) {
      matchingIndices.add(idx);
    }
  });

  // Show/hide nodes based on matches
  document.querySelectorAll('.tree-node').forEach(node => {
    const label = node.querySelector('.tree-label[data-record-idx]');
    if (label) {
      const idx = parseInt(label.dataset.recordIdx, 10);
      if (matchingIndices.has(idx)) {
        node.classList.remove('tree-hidden');
        node.classList.add('tree-match');
      } else {
        node.classList.add('tree-hidden');
        node.classList.remove('tree-match');
      }
    }
  });

  // Auto-expand all to show matches
  if (term) {
    document.querySelectorAll('.tree-children').forEach(c => c.classList.remove('collapsed'));
    document.querySelectorAll('.tree-toggle').forEach(t => {
      t.setAttribute('aria-expanded', 'true');
      t.classList.remove('collapsed');
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Attach event handlers to tree elements
// ─────────────────────────────────────────────────────────────
function attachTreeEvents() {
  // Tree search (now in main toolbar)
  const searchInput = document.getElementById('tree-search-input');
  if (searchInput) {
    let searchTimer = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        filterTreeNodes(e.target.value);
      }, 150);
    });
  }

  // Toggle expand/collapse
  const toggles = document.querySelectorAll('.tree-toggle');
  toggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nodeId = btn.dataset.nodeId;
      const container = document.getElementById(nodeId);
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';

      if (container) {
        container.classList.toggle('collapsed');
        btn.setAttribute('aria-expanded', !isExpanded);
        btn.classList.toggle('collapsed');
      }
    });
  });

  // Open record modal on label click
  const labels = document.querySelectorAll('.tree-label[data-record-idx]');
  labels.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.recordIdx, 10);
      if (!isNaN(idx)) {
        const records = state.structure?.groups?.flatMap(g => g.rows) || [];
        const record = records[idx];
        if (record) {
          openRecordModalFromData(record);
        }
      }
    });
  });
}
