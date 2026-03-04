// ─────────────────────────────────────────────────────────────
// App entry point — imports and initialisation
// ─────────────────────────────────────────────────────────────
import { state, parseViewStateHash } from './state.js';
import { initRerender } from './table.js';
import { initEvents } from './events.js';
import { loadJSON } from './load.js';
import * as eventsMod from './events.js';

// Wire up the lazy-import bridge so table.js rerender() is synchronous
initRerender(eventsMod);

// Parse URL hash for pending view state
state.pendingState = parseViewStateHash();

// Attach all DOM event listeners
initEvents();

// Auto-load from scrambler import or previous session
const _importJson = (() => {
  try {
    const imp = sessionStorage.getItem('viewer-import');
    if (imp) { sessionStorage.removeItem('viewer-import'); return imp; }
    return sessionStorage.getItem('viewer-session-json') || null;
  } catch (e) { return null; }
})();

if (_importJson) {
  try { loadJSON(_importJson); } catch (e) { /* ignore stale session */ }
}
