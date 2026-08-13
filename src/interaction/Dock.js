/**
 * FWF Interaction — Dock
 *
 * Owns: mode edge ↔ DOCK, expanded / closing sub-state, last side memory.
 * Does NOT: implement free PANEL width, playlist data, or audio.
 */

/**
 * @typedef {Object} DockState
 * @property {"left"|"right"|null} side
 * @property {boolean} expanded
 * @property {boolean} closing
 */

/**
 * @typedef {Object} DockHandlers
 * @property {(side: "left"|"right") => void} [onDock]
 * @property {() => void} [onUndock]
 * @property {(expanded: boolean) => void} [onExpandedChange]
 * @property {() => void} [lockAnchor]  — keep ball on ideal edge coords
 * @property {() => void} [updateDirection] — dock-down vs up stack
 * @property {() => void} [sync]
 * @property {number} [closeAnimMs]
 */

/**
 * @param {DockHandlers} [handlers]
 */
export function createDock(handlers) {
  const h = handlers || {};
  /** @type {DockState} */
  let state = {
    side: null,
    expanded: false,
    closing: false,
  };
  let closeTimer = null;

  function getState() {
    return { ...state };
  }

  function isDocked() {
    return !!state.side;
  }

  /**
   * @param {"left"|"right"|null} side
   */
  function setSide(side) {
    if (side === "left" || side === "right") {
      state.side = side;
      state.closing = false;
      if (h.onDock) h.onDock(side);
      if (h.lockAnchor) h.lockAnchor(side);
      if (h.updateDirection) h.updateDirection();
      if (h.sync) h.sync();
    } else {
      state.expanded = false;
      state.closing = false;
      if (h.onUndock) h.onUndock();
      // side cleared only when caller decides (may keep during drag)
      if (h.sync) h.sync();
    }
  }

  function clearSide() {
    state.side = null;
    state.expanded = false;
    state.closing = false;
    if (h.sync) h.sync();
  }

  /**
   * Toggle or set dock expanded (function balls), with closing animation.
   * @param {boolean} open
   */
  function setExpanded(open) {
    open = !!open;
    if (!state.side) return;

    if (!open) {
      state.expanded = false;
      state.closing = true;
      if (h.onExpandedChange) h.onExpandedChange(false);
      if (h.lockAnchor) h.lockAnchor(state.side);
      if (h.sync) h.sync();

      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        state.closing = false;
        closeTimer = null;
        if (h.lockAnchor) h.lockAnchor(state.side);
        if (h.onCloseAnimEnd) h.onCloseAnimEnd();
        if (h.sync) h.sync();
      }, h.closeAnimMs != null ? h.closeAnimMs : 320);
      return;
    }

    state.closing = false;
    state.expanded = true;
    if (h.lockAnchor) h.lockAnchor(state.side);
    if (h.updateDirection) h.updateDirection();
    if (h.onExpandedChange) h.onExpandedChange(true);
    if (h.sync) h.sync();
  }

  function isClosing() {
    return state.closing;
  }

  function isExpanded() {
    return state.expanded && !state.closing;
  }

  return {
    getState,
    isDocked,
    setSide,
    clearSide,
    setExpanded,
    isClosing,
    isExpanded,
    getSide: () => state.side,
  };
}
