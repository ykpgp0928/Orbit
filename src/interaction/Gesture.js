/**
 * FWF Interaction — Gesture
 *
 * Owns: short press vs long press, click threshold, ghost-click guard window.
 * Does NOT: move position, snap, dock, or touch audio.
 *
 * Outputs intents via callbacks:
 *   onToggle()           — short press on cover
 *   onDragStart(e)       — long press or move past threshold
 */

/**
 * @typedef {Object} GestureConfig
 * @property {number} longPressMs
 * @property {number} clickThreshold
 */

/**
 * @typedef {Object} GestureHandlers
 * @property {() => void} [onToggle]
 * @property {(e: PointerEvent) => void} [onDragStart]
 * @property {() => boolean} [isBlocked]  — e.g. dock-closing / ignore window
 */

/**
 * @param {GestureConfig} config
 * @param {GestureHandlers} handlers
 */
export function createGesture(config, handlers) {
  let longPressTimer = null;
  let activePointer = null;
  let startClientX = 0;
  let startClientY = 0;
  let moveDist = 0;
  let dragging = false;
  let longPressTriggered = false;
  let gestureId = null;
  let toggleBusy = false;
  let ignoreUntil = 0;

  function clearLongPress() {
    if (longPressTimer != null) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function blockToggle(ms) {
    ignoreUntil = Math.max(ignoreUntil, Date.now() + (ms || 0));
  }

  function isToggleBlocked() {
    if (toggleBusy) return true;
    if (Date.now() < ignoreUntil) return true;
    if (handlers.isBlocked && handlers.isBlocked()) return true;
    return false;
  }

  /**
   * @param {PointerEvent} e
   * @returns {{ startClientX: number, startClientY: number } | null}
   */
  function onPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return null;
    if (activePointer != null) return null;

    gestureId = null;
    activePointer = e.pointerId;
    startClientX = e.clientX;
    startClientY = e.clientY;
    moveDist = 0;
    dragging = false;
    longPressTriggered = false;

    clearLongPress();
    longPressTimer = setTimeout(() => {
      if (activePointer == null) return;
      longPressTriggered = true;
      dragging = true;
      if (handlers.onDragStart) handlers.onDragStart(e);
    }, config.longPressMs);

    return { startClientX, startClientY };
  }

  /**
   * @param {PointerEvent} e
   * @returns {"drag" | "pending" | "ignore"}
   */
  function onPointerMove(e) {
    if (activePointer == null || e.pointerId !== activePointer) return "ignore";
    if (e.pointerType === "mouse" && e.buttons === 0) return "ignore";

    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    moveDist = Math.sqrt(dx * dx + dy * dy);

    if (!dragging && moveDist > config.clickThreshold) {
      clearLongPress();
      dragging = true;
      longPressTriggered = false;
      if (handlers.onDragStart) handlers.onDragStart(e);
      return "drag";
    }
    return dragging ? "drag" : "pending";
  }

  /**
   * @param {PointerEvent} e
   * @param {{ wasDragging?: boolean, pointerId?: number }} session
   */
  function onPointerUp(e, session) {
    const pid =
      session && session.pointerId != null
        ? session.pointerId
        : e && e.pointerId;
    // allow caller to end session first then pass pointerId
    if (
      session &&
      session.pointerId == null &&
      activePointer != null &&
      e &&
      e.pointerId !== activePointer
    ) {
      return;
    }
    clearLongPress();
    activePointer = null;

    const wasDrag = session && session.wasDragging;
    if (wasDrag) return;

    // one toggle per gesture id
    if (gestureId === pid) return;
    gestureId = pid;
    setTimeout(() => {
      if (gestureId === pid) gestureId = null;
    }, 600);

    if (isToggleBlocked()) return;

    toggleBusy = true;
    try {
      if (handlers.onToggle) handlers.onToggle();
    } finally {
      setTimeout(() => {
        toggleBusy = false;
      }, 50);
    }
  }

  function cancel() {
    clearLongPress();
    activePointer = null;
    dragging = false;
    longPressTriggered = false;
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    cancel,
    blockToggle,
    isToggleBlocked,
    getActivePointer: () => activePointer,
    getStart: () => ({ x: startClientX, y: startClientY }),
    isDragging: () => dragging,
    wasLongPress: () => longPressTriggered,
    getMoveDist: () => moveDist,
    getIgnoreUntil: () => ignoreUntil,
  };
}
