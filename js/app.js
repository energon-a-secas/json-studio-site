// ═══════════════════════════════════════════
//  APP ENTRY POINT
// ═══════════════════════════════════════════

import { state } from './state.js';
import { render } from './render.js';
import { setupEvents } from './events.js';

// ── Initialize root node ──

function initRoot(type) {
  state.nodeMap    = {};
  state.idCounter  = 0;
  state.root       = { id: 0, type, key: '', children: [], collapsed: false };
  state.nodeMap[0] = state.root;
  render();
}

// ── Boot ──

setupEvents();
initRoot('object');
