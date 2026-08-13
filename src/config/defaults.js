/**
 * FWF — Default configuration
 * Values must match interaction-baseline-v1 (see docs/baseline-constants.js)
 * Changing defaults requires re-running the full interaction checklist.
 */

export const DEFAULTS = {
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

  // Timing (empirical from baseline)
  ghostClickGuardMs: {
    afterDockClose: 1000,
    afterToggle: 450,
    afterDockCloseAnim: 400,
  },
  dockCloseAnimMs: 320,
  listCloseAnimMs: 420,

  // Layout hints (CSS still owns actual rendering)
  openWidthDesktop: 360,
  edgePaddingDesktop: 16,
  edgePaddingMobile: 12,
  rootOffsetDesktop: { left: 20, bottom: 20 },
  rootOffsetMobile: { left: 16, bottom: 16 },

  // Behavior flags
  behavior: {
    desktop: {
      hoverExpand: true,
      edgeSnap: true,
      expandLeft: true,
    },
    mobile: {
      clickExpand: true,
      longPressDrag: true,
      ghostClickGuardMs: 650,
    },
  },
};

/**
 * Class names that Renderer is allowed / required to manage.
 * Must stay in sync with baseline CSS selectors.
 */
export const MANAGED_CLASSES = [
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
