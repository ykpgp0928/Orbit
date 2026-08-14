/**
 * FWF Interaction — Gesture
 *
 * Owns: short press vs long press, click threshold, ghost-click guard.
 * Long-press + small movement → onLongPressTap (e.g. open Orbit launcher)
 * Long-press + move / move past threshold → onDragStart
 */

/**
 * @typedef {Object} GestureConfig
 * @property {number} longPressMs
 * @property {number} clickThreshold
 * @property {number} [longPressTapMax] max movement to still count as long-press tap
 */

/**
 * @typedef {Object} GestureHandlers
 * @property {() => void} [onToggle]
 * @property {(e: PointerEvent) => void} [onDragStart]
 * @property {(e: PointerEvent) => void} [onLongPressTap]
 * @property {() => boolean} [isBlocked]
 */

/**
 * @param {GestureConfig} config
 * @param {GestureHandlers} handlers
 */
export function createGesture(config, handlers) {
  const longPressMs = config.longPressMs != null ? config.longPressMs : 550;
  const clickThreshold = config.clickThreshold != null ? config.clickThreshold : 8;
  const longPressTapMax =
    config.longPressTapMax != null ? config.longPressTapMax : 20;

  let longPressTimer = null;
  let activePointer = null;
  let startClientX = 0;
  let startClientY = 0;
  let moveDist = 0;
  let dragging = false;
  let longPressTriggered = false;
  let lastEvent = null;
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

  function beginDrag(e) {
    if (dragging) return;
    dragging = true;
    clearLongPress();
    if (handlers.onDragStart) handlers.onDragStart(e || lastEvent);
  }

  /**
   * @param {PointerEvent} e
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
    lastEvent = e;

    clearLongPress();
    longPressTimer = setTimeout(function () {
      if (activePointer == null) return;
      // Armed only — drag starts on move; stay-put release → long-press tap
      longPressTriggered = true;
    }, longPressMs);

    return { startClientX: startClientX, startClientY: startClientY };
  }

  /**
   * @param {PointerEvent} e
   * @returns {"drag" | "pending" | "ignore"}
   */
  function onPointerMove(e) {
    if (activePointer == null || e.pointerId !== activePointer) return "ignore";
    if (e.pointerType === "mouse" && e.buttons === 0) return "ignore";

    lastEvent = e;
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    moveDist = Math.sqrt(dx * dx + dy * dy);

    if (!dragging && moveDist > clickThreshold) {
      beginDrag(e);
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
    if (
      session &&
      session.pointerId == null &&
      activePointer != null &&
      e &&
      e.pointerId !== activePointer
    ) {
      return;
    }

    const wasLong = longPressTriggered;
    const dist = moveDist;
    clearLongPress();
    activePointer = null;

    const wasDrag = (session && session.wasDragging) || dragging;
    dragging = false;
    longPressTriggered = false;

    if (wasDrag) return;

    if (gestureId === pid) return;
    gestureId = pid;
    setTimeout(function () {
      if (gestureId === pid) gestureId = null;
    }, 600);

    if (isToggleBlocked()) return;

    // Long-press + little movement → launcher / long-press action
    if (wasLong && dist <= longPressTapMax) {
      toggleBusy = true;
      try {
        if (handlers.onLongPressTap) handlers.onLongPressTap(e || lastEvent);
      } finally {
        setTimeout(function () {
          toggleBusy = false;
        }, 50);
      }
      blockToggle(400);
      return;
    }

    // Short tap
    if (!wasLong) {
      toggleBusy = true;
      try {
        if (handlers.onToggle) handlers.onToggle();
      } finally {
        setTimeout(function () {
          toggleBusy = false;
        }, 50);
      }
    }
  }

  function cancel() {
    clearLongPress();
    activePointer = null;
    dragging = false;
    longPressTriggered = false;
  }

  return {
    onPointerDown: onPointerDown,
    onPointerMove: onPointerMove,
    onPointerUp: onPointerUp,
    cancel: cancel,
    blockToggle: blockToggle,
    isToggleBlocked: isToggleBlocked,
    getActivePointer: function () {
      return activePointer;
    },
    getStart: function () {
      return { x: startClientX, y: startClientY };
    },
    isDragging: function () {
      return dragging;
    },
    wasLongPress: function () {
      return longPressTriggered;
    },
    getMoveDist: function () {
      return moveDist;
    },
    getIgnoreUntil: function () {
      return ignoreUntil;
    },
  };
}
