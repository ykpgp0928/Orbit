/**
 * FWF UI — Renderer
 *
 * Phase 1: the ONLY place that writes Shell-related classList.
 * Maps ShellState → DOM classes on the root element.
 *
 * Existing CSS selectors are preserved; we only centralize who may toggle them.
 */

import { MANAGED_CLASSES } from "../config/defaults.js";

/**
 * @typedef {import("../core/State.js").ShellState} ShellState
 */

/**
 * Create a renderer bound to a root element.
 * @param {HTMLElement} root
 */
export function createRenderer(root) {
  if (!root) {
    throw new Error("[FWF Renderer] root element is required");
  }

  let lastSnapshot = null;

  /**
   * Project state onto DOM classes.
   * @param {ShellState} state
   */
  function sync(state) {
    if (!root || !state) return;

    // Build desired class set from state
    const desired = new Set();

    // mode projections (keep baseline class names)
    if (state.mode === "PANEL") {
      desired.add("is-open");
    }
    // DOCK uses is-docked; expanded is extra
    if (state.mode === "DOCK" || state.dock.enabled) {
      desired.add("is-docked");
      if (state.dock.side === "left") desired.add("dock-left");
      if (state.dock.side === "right") desired.add("dock-right");
    }
    if (state.dock.expanded) {
      // baseline: is-open while dock expanded (for dock button visibility)
      desired.add("is-open");
    }
    if (state.dock.closing) {
      desired.add("is-dock-closing");
    }

    // layout
    if (state.layout.expandLeft) desired.add("expand-left");
    if (state.layout.listOpen) desired.add("is-list-open");
    if (state.layout.listClosing) desired.add("is-list-closing");
    if (state.layout.listUp) desired.add("list-up");
    if (state.layout.dockDown) desired.add("dock-down");
    if (state.dock.expanded || state.layout.listOpen) {
      // dock-list-open used when dock sheet visible
      // actual sheet visibility still coordinated by host for now
    }

    // interaction
    if (state.interaction.dragging) desired.add("is-dragging");
    if (state.interaction.snapping) desired.add("is-snapping");
    if (state.interaction.noHoverExpand) desired.add("no-hover-expand");
    if (state.interaction.magnet) {
      desired.add("is-magnet");
      if (state.interaction.magnetSide === "left") desired.add("magnet-left");
      if (state.interaction.magnetSide === "right") desired.add("magnet-right");
    }

    // media flag (still on shell for cover animation)
    if (state.playing) desired.add("is-playing");
    if (state.isMobile) desired.add("is-mobile");

    // Apply: only touch managed classes
    MANAGED_CLASSES.forEach((cls) => {
      const shouldHave = desired.has(cls);
      const has = root.classList.contains(cls);
      if (shouldHave && !has) root.classList.add(cls);
      if (!shouldHave && has) root.classList.remove(cls);
    });

    lastSnapshot = state;
  }

  /**
   * Force re-sync from last state (e.g. after external DOM repair)
   */
  function resync() {
    if (lastSnapshot) sync(lastSnapshot);
  }

  return {
    sync,
    resync,
    getLastState: () => lastSnapshot,
  };
}

/**
 * Helper: subscribe state store → renderer automatically
 * @param {{ subscribe: Function, get: Function }} store
 * @param {{ sync: Function }} renderer
 * @returns {() => void} unsubscribe
 */
export function bindStateToRenderer(store, renderer) {
  // initial
  renderer.sync(store.get());
  return store.subscribe((next) => {
    renderer.sync(next);
  });
}
