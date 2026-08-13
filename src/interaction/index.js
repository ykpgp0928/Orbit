/**
 * FWF Interaction domain — public exports
 *
 * Order of ownership:
 *   Gesture → Drag → Snap → Dock → Layout → ExpandPolicy
 */

export { createGesture } from "./Gesture.js";
export { createDrag } from "./Drag.js";
export { createSnap } from "./Snap.js";
export { createDock } from "./Dock.js";
export { createLayout } from "./Layout.js";
export {
  resolveExpandDirection,
  resolveDockStackDirection,
  expandDownTranslateY,
} from "./ExpandPolicy.js";
