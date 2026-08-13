/**
 * Phase 0 — Extracted constants from interaction-baseline-v1
 * ---------------------------------------------------------
 * These values define the current "feel".
 * In Phase 1+ they should be moved into config/defaults.js
 * with identical default values. Do not change numbers here
 * without updating the checklist expectations.
 */

export const BASELINE_CONFIG = {
  // Identity
  storageKey: "mp-state-v3",

  // Geometry
  ballSize: 66,
  ballSizeMobile: 52,

  // Gesture
  longPressMs: 380,
  clickThreshold: 12,

  // Magnetic snap
  snapThreshold: 40,
  snapRelease: 36,
  snapThresholdMobile: 28,
  snapReleaseMobile: 28,

  // Timing (empirical, from current logic)
  ghostClickGuardMs: {
    afterDockClose: 1000,
    afterToggle: 450,
    afterDockCloseAnim: 400,
  },
  dockCloseAnimMs: 320,
  listCloseAnimMs: 420,

  // Layout
  openWidthDesktop: 360,
  openWidthMobileExpr: "min(72vw, 260px)",
  openHeightMobileMaxExpr: "min(34vh, 210px)",
  edgePaddingDesktop: 16,
  edgePaddingMobile: 12,
  rootOffsetDesktop: { left: 20, bottom: 20 },
  rootOffsetMobile: { left: 16, bottom: 16 },
};

/**
 * Current class names that Renderer must continue to support.
 * (Semantic contract for Phase 1+)
 */
export const BASELINE_CLASSES = [
  "is-open",
  "is-docked",
  "dock-left",
  "dock-right",
  "is-dragging",
  "is-snapping",
  "is-dock-closing",
  "expand-left",
  "is-list-open",
  "is-list-closing",
  "list-up",
  "dock-list-open",
  "dock-down",
  "is-playing",
  "is-mobile",
  "no-hover-expand",
  "is-magnet",
  "magnet-left",
  "magnet-right",
];

/**
 * Slot mapping (Phase 2 target)
 */
export const SLOT_MAP = {
  root: "#music-player",
  cover: ".mp-cover",
  panel: ".mp-body",
  dock: ".mp-dock-btns",
  sheet: ["#mp-list", "#mp-dock-list"],
};
