// ═══════════════════════════════════════════
//  SHARED MUTABLE STATE
// ═══════════════════════════════════════════

export const state = {
  root: null,
  nodeMap: {},
  idCounter: 0,
  drag: null,       // { source: 'palette'|'canvas', type?, nodeId? }
  editMode: false
};
