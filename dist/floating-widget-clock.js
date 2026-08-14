/*! Orbit / FWF bundled */
(function () {
"use strict";
var __modules = {};
var __cache = {};
function __require(k) {
  if (__cache[k]) return __cache[k];
  var m = { default: undefined };
  var factory = __modules[k];
  if (!factory) throw new Error('Module not found: ' + k);
  __cache[k] = m;
  factory(m, __require);
  return m;
}

/* ---- src/interaction/Gesture.js ---- */
__modules["src/interaction/Gesture.js"] = function (__mod, __require) {
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
function createGesture(config, handlers) {
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

if (typeof createGesture !== 'undefined') __mod.createGesture = createGesture;

};

/* ---- src/interaction/Drag.js ---- */
__modules["src/interaction/Drag.js"] = function (__mod, __require) {
/**
 * FWF Interaction — Drag
 *
 * Owns: pointer capture session, delta → position intent.
 * Does NOT: snap, dock UI, or render classes.
 */

/**
 * @typedef {Object} DragContext
 * @property {() => { x: number, y: number }} getPosition
 * @property {(x: number, y: number) => void} setPosition
 * @property {(x: number, y: number) => [number, number]} clampPosition
 * @property {(freeX: number, clientX: number) => number} [applyMagneticX]
 * @property {() => void} [onDragBegin]  — collapse UI, clear dock, etc.
 * @property {() => void} [onDragEnd]
 */

/**
 * @param {DragContext} ctx
 */
function createDrag(ctx) {
  let originX = 0;
  let originY = 0;
  let active = false;

  function begin(startPos) {
    originX = startPos.x;
    originY = startPos.y;
    active = true;
    if (ctx.onDragBegin) ctx.onDragBegin();
  }

  /**
   * @param {number} dx
   * @param {number} dy
   * @param {number} clientX
   * @param {{ startClientX?: number }} [pointerStart] — gesture start for magnetic session
   */
  function move(dx, dy, clientX, pointerStart) {
    if (!active) return;
    let freeX = originX + dx;
    if (ctx.applyMagneticX) {
      freeX = ctx.applyMagneticX(freeX, clientX, {
        getOriginX: function () {
          return originX;
        },
        setOriginX: function (x) {
          originX = x;
        },
        startClientX:
          pointerStart && pointerStart.startClientX != null
            ? pointerStart.startClientX
            : pointerStart && pointerStart.x != null
              ? pointerStart.x
              : undefined,
      });
    }
    const [nx, ny] = ctx.clampPosition(freeX, originY + dy);
    ctx.setPosition(nx, ny);
  }

  function end() {
    if (!active) return false;
    active = false;
    if (ctx.onDragEnd) ctx.onDragEnd();
    return true;
  }

  return {
    begin: begin,
    move: move,
    end: end,
    isActive: function () {
      return active;
    },
    getOrigin: function () {
      return { x: originX, y: originY };
    },
    setOriginX: function (x) {
      originX = x;
    },
  };
}

if (typeof createDrag !== 'undefined') __mod.createDrag = createDrag;

};

/* ---- src/interaction/Snap.js ---- */
__modules["src/interaction/Snap.js"] = function (__mod, __require) {
/**
 * FWF Interaction — Snap
 *
 * Owns: edge thresholds, magnetic hysteresis, release → dock side.
 * Does NOT: set DOM classes or dock expanded UI.
 */

/**
 * @typedef {Object} SnapConfig
 * @property {number} snapThreshold
 * @property {number} snapRelease
 * @property {number} snapThresholdMobile
 * @property {number} snapReleaseMobile
 * @property {number} ballSize
 * @property {number} ballSizeMobile
 */

/**
 * @typedef {Object} SnapContext
 * @property {() => boolean} isMobile
 * @property {() => HTMLElement | null} getRoot
 * @property {() => number} getPosX
 * @property {() => number} getPosY
 * @property {(x: number, y: number) => void} setPosition
 * @property {(x: number, y: number) => [number, number]} clampPosition
 * @property {(side: "left"|"right"|null) => void} onSnapSide
 * @property {() => void} [onSnappingStart]
 * @property {() => void} [onSnappingEnd]
 */

/**
 * @param {SnapConfig} config
 * @param {SnapContext} ctx
 */
function createSnap(config, ctx) {
  let magnetSide = null; // "left" | "right" | null

  function getBallSize() {
    return ctx.isMobile() ? config.ballSizeMobile : config.ballSize;
  }

  function getSnapTargets() {
    const root = ctx.getRoot();
    const vw = window.innerWidth;
    const leftBase = root
      ? parseFloat(getComputedStyle(root).left) || 20
      : 20;
    const w = getBallSize();
    const edgePad = ctx.isMobile() ? 12 : 16;
    return {
      leftBase,
      w,
      leftX: edgePad - leftBase,
      rightX: vw - w - edgePad - leftBase,
      vw,
    };
  }

  function getSnapDistances() {
    const mobile = ctx.isMobile() || "ontouchstart" in window;
    return {
      enter: mobile ? config.snapThresholdMobile : config.snapThreshold,
      leave: mobile ? config.snapReleaseMobile : config.snapRelease,
    };
  }

  /**
   * Live magnetic X while dragging.
   * @param {number} freeX
   * @param {number} clientX
   * @param {{ originX?: number, startClientX?: number, getOriginX?: Function, setOriginX?: Function }} session
   */
  function applyMagneticX(freeX, clientX, session) {
    const { leftBase, w, leftX, rightX, vw } = getSnapTargets();
    const { enter, leave } = getSnapDistances();
    const absLeft = leftBase + freeX;
    const absRight = absLeft + w;
    session = session || {};

    function getOx() {
      if (typeof session.getOriginX === "function") return session.getOriginX();
      if (session.originX != null) return session.originX;
      return 0;
    }
    function setOx(x) {
      if (typeof session.setOriginX === "function") session.setOriginX(x);
      else session.originX = x;
    }
    function getStartX() {
      return session.startClientX != null ? session.startClientX : 0;
    }
    function setMagnet(side) {
      magnetSide = side;
      if (ctx.onMagnetChange) ctx.onMagnetChange(side);
    }

    if (magnetSide === "left") {
      let tentative = getOx() + (clientX - getStartX());
      if (tentative < leftX) {
        setOx(leftX - (clientX - getStartX()));
        return leftX;
      }
      if (tentative - leftX >= leave) {
        setMagnet(null);
        return tentative;
      }
      return leftX;
    }
    if (magnetSide === "right") {
      let tentative = getOx() + (clientX - getStartX());
      if (tentative > rightX) {
        setOx(rightX - (clientX - getStartX()));
        return rightX;
      }
      if (rightX - tentative >= leave) {
        setMagnet(null);
        return tentative;
      }
      return rightX;
    }
    if (absLeft < enter) {
      setMagnet("left");
      setOx(leftX - (clientX - getStartX()));
      return leftX;
    }
    if (absRight > vw - enter) {
      setMagnet("right");
      setOx(rightX - (clientX - getStartX()));
      return rightX;
    }
    return freeX;
  }

  function snapToEdge() {
    const { leftBase, w, leftX, rightX, vw } = getSnapTargets();
    const { enter } = getSnapDistances();
    const posX = ctx.getPosX();
    const posY = ctx.getPosY();
    const absLeft = leftBase + posX;
    const absRight = absLeft + w;
    let targetX = posX;
    let finalSide = null;

    if (magnetSide === "left" || absLeft < enter) {
      targetX = leftX;
      finalSide = "left";
    } else if (magnetSide === "right" || absRight > vw - enter) {
      targetX = rightX;
      finalSide = "right";
    }

    const [cx, cy] = ctx.clampPosition(targetX, posY);
    const moved = Math.abs(cx - posX) > 0.5 || Math.abs(cy - posY) > 0.5;
    ctx.setPosition(cx, cy);
    magnetSide = null;
    if (ctx.onMagnetChange) ctx.onMagnetChange(null);

    if (moved && ctx.onSnappingStart) {
      ctx.onSnappingStart();
      setTimeout(() => {
        if (ctx.onSnappingEnd) ctx.onSnappingEnd();
      }, 400);
    } else if (!moved && ctx.onSnappingEnd) {
      // still clear magnet visuals
    }

    if (ctx.onSnapSide) ctx.onSnapSide(finalSide);
    return finalSide;
  }

  function clearMagnet() {
    magnetSide = null;
  }

  function getMagnetSide() {
    return magnetSide;
  }

  /** Near-edge test without requiring is-docked class */
  function isNearDockEdge(posX) {
    const x = posX != null ? posX : ctx.getPosX();
    const { leftBase, w, leftX, rightX, vw } = getSnapTargets();
    const { enter } = getSnapDistances();
    const absLeft = leftBase + x;
    const absRight = absLeft + w;
    const th = enter + 20;
    if (absLeft < th || Math.abs(x - leftX) < 10) return "left";
    if (absRight > vw - th || Math.abs(x - rightX) < 10) return "right";
    return null;
  }

  function syncDockFromPosition(posX, dragging) {
    if (dragging) return null;
    const x = posX != null ? posX : ctx.getPosX();
    const { leftBase, w, leftX, rightX, vw } = getSnapTargets();
    const { enter } = getSnapDistances();
    const absLeft = leftBase + x;
    const absRight = absLeft + w;
    const threshold = enter + 8;
    if (absLeft < threshold || Math.abs(x - leftX) < 4) return "left";
    if (absRight > vw - threshold || Math.abs(x - rightX) < 4) return "right";
    return null;
  }

  return {
    applyMagneticX,
    snapToEdge,
    clearMagnet,
    getMagnetSide,
    isNearDockEdge,
    syncDockFromPosition,
    getSnapTargets,
    getSnapDistances,
    getBallSize,
  };
}

if (typeof createSnap !== 'undefined') __mod.createSnap = createSnap;

};

/* ---- src/interaction/ExpandPolicy.js ---- */
__modules["src/interaction/ExpandPolicy.js"] = function (__mod, __require) {
/**
 * FWF Interaction — ExpandPolicy
 *
 * Pure layout policy for floating shells:
 * - free panel: expandLeft / expandDown
 * - dock function stack: dockDown
 *
 * Host/Renderer only applies classes & transforms.
 */

/**
 * @typedef {Object} ExpandInput
 * @property {number} absLeft
 * @property {number} absTop
 * @property {number} ballW
 * @property {number} ballH
 * @property {number} openW
 * @property {number} openH
 * @property {number} viewportW
 * @property {number} viewportH
 * @property {"left"|"right"|null} [dockSide]
 * @property {number} [pad=12]
 */

/**
 * Free / panel open direction.
 * @param {ExpandInput} input
 * @returns {{ expandLeft: boolean, expandDown: boolean }}
 */
function resolveExpandDirection(input) {
  const pad = input.pad != null ? input.pad : 12;
  const vw = input.viewportW;
  const vh = input.viewportH;
  const openW = input.openW;
  const openH = input.openH;
  const ballH = input.ballH;
  const absLeft = input.absLeft;
  const absTop = input.absTop;
  const dockSide = input.dockSide || null;

  let expandLeft = false;
  if (dockSide === "right") {
    expandLeft = true;
  } else if (dockSide === "left") {
    expandLeft = false;
  } else {
    expandLeft = absLeft + openW > vw - pad;
  }

  const spaceAbove = absTop;
  const spaceBelow = vh - (absTop + ballH);
  const expandDown =
    spaceAbove < openH + pad && spaceBelow > spaceAbove;

  return { expandLeft: !!expandLeft, expandDown: !!expandDown };
}

/**
 * Dock 功能球纵向：上方不够堆叠高度且下方更宽裕 → 向下排。
 * @param {{ absTop: number, absBottom: number, stackH: number, viewportH: number, pad?: number }} input
 * @returns {{ dockDown: boolean }}
 */
function resolveDockStackDirection(input) {
  const pad = input.pad != null ? input.pad : 8;
  const spaceAbove = input.absTop;
  const spaceBelow = input.viewportH - input.absBottom;
  const dockDown =
    spaceAbove < input.stackH + pad && spaceBelow > spaceAbove;
  return { dockDown: !!dockDown };
}

/**
 * bottom 锚定壳：展开后高度变大默认往上长。
 * expandDown 时需要额外 translateY，使「球顶」大致不动、面板往下长。
 * 返回值加到现有 posY 上（CSS transform 正值向下）。
 *
 * @param {boolean} isOpen
 * @param {boolean} expandDown
 * @param {number} ballH
 * @param {number} openH
 */
function expandDownTranslateY(isOpen, expandDown, ballH, openH) {
  if (isOpen && expandDown) return openH - ballH;
  return 0;
}

if (typeof resolveExpandDirection !== 'undefined') __mod.resolveExpandDirection = resolveExpandDirection;
if (typeof resolveDockStackDirection !== 'undefined') __mod.resolveDockStackDirection = resolveDockStackDirection;
if (typeof expandDownTranslateY !== 'undefined') __mod.expandDownTranslateY = expandDownTranslateY;

};

/* ---- src/core/WidgetRegistry.js ---- */
__modules["src/core/WidgetRegistry.js"] = function (__mod, __require) {
/**
 * Orbit / FWF Core — WidgetRegistry (subsystem)
 *
 * Holds widget *definitions* (id → { mount }).
 * Public app code should prefer window.Orbit / Orbit.registry, not this module alone.
 * Runtime hosts (Phase A+) mount instances via Orbit; definitions stay here.
 */

const registry = Object.create(null);

/**
 * @param {string} id
 * @param {{ mount: Function, unmount?: Function }} widget
 */
function registerWidget(id, widget) {
  if (!id || !widget || typeof widget.mount !== "function") {
    throw new Error("registerWidget requires id and mount()");
  }
  registry[id] = widget;
}

/**
 * @param {string} id
 */
function getWidget(id) {
  return registry[id] || null;
}

/**
 * @returns {string[]}
 */
function listWidgets() {
  return Object.keys(registry);
}

/**
 * @param {string} id
 * @param {object} ctx — shell refs, storage, emit, etc.
 */
function mountWidget(id, ctx) {
  const w = getWidget(id);
  if (!w) throw new Error("Unknown widget: " + id);
  return w.mount(ctx);
}

if (typeof registerWidget !== 'undefined') __mod.registerWidget = registerWidget;
if (typeof getWidget !== 'undefined') __mod.getWidget = getWidget;
if (typeof listWidgets !== 'undefined') __mod.listWidgets = listWidgets;
if (typeof mountWidget !== 'undefined') __mod.mountWidget = mountWidget;

};

/* ---- src/widgets/clock/ClockWidget.js ---- */
__modules["src/widgets/clock/ClockWidget.js"] = function (__mod, __require) {
var __dep0 = __require("src/core/WidgetRegistry.js");
var registerWidget = __dep0.registerWidget;
/**
 * FWF Clock Widget — second official widget (Phase 5)
 *
 * Proves the Shell is not Music-only: same spatial interaction language,
 * different content (time display).
 */

/**
 * Format helpers
 */
function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

function formatTime(d, withSeconds) {
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  if (!withSeconds) return h + ":" + m;
  return h + ":" + m + ":" + pad(d.getSeconds());
}

function formatDate(d) {
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return y + "-" + mo + "-" + day + " 周" + week;
}

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.root — floating root
 * @param {object} [ctx.refs] — { face, panel, dateEl, fullTimeEl }
 * @param {{ intervalMs?: number, showSeconds?: boolean }} [ctx.options]
 */
function mount(ctx) {
  const root = ctx && ctx.root;
  const refs = (ctx && ctx.refs) || {};
  const options = (ctx && ctx.options) || {};
  const intervalMs = options.intervalMs != null ? options.intervalMs : 1000;
  const showSeconds = !!options.showSeconds;

  let timer = null;

  function tick() {
    const now = new Date();
    const t = formatTime(now, showSeconds);
    if (refs.face) refs.face.textContent = t;
    if (refs.fullTimeEl) refs.fullTimeEl.textContent = formatTime(now, true);
    if (refs.dateEl) refs.dateEl.textContent = formatDate(now);
    if (root) root.setAttribute("data-time", t);
  }

  function start() {
    stop();
    tick();
    timer = setInterval(tick, intervalMs);
  }

  function stop() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function destroy() {
    stop();
  }

  start();

  return {
    id: "clock",
    tick: tick,
    start: start,
    stop: stop,
    destroy: destroy,
  };
}

registerWidget("clock", { mount: mount });


if (typeof mount !== 'undefined') __mod.mount = mount;

};

/* ---- src/host/clock-host.js ---- */
__modules["src/host/clock-host.js"] = function (__mod, __require) {
var __dep0 = __require("src/interaction/Gesture.js");
var createGesture = __dep0.createGesture;
var __dep1 = __require("src/interaction/Drag.js");
var createDrag = __dep1.createDrag;
var __dep2 = __require("src/interaction/Snap.js");
var createSnap = __dep2.createSnap;
var __dep3 = __require("src/interaction/ExpandPolicy.js");
var resolveExpandDirection = __dep3.resolveExpandDirection;
var expandDownTranslateY = __dep3.expandDownTranslateY;
var __dep4 = __require("src/widgets/clock/ClockWidget.js");
var mount = __dep4.mount;
/**
 * FWF Clock Host — minimal floating shell + Clock widget
 * Reuses Gesture / Drag / Snap (same interaction language as Music).
 */





const CONFIG = {
  storageKey: "fwf-clock-pos-v1",
  snapThreshold: 40,
  snapRelease: 36,
  snapThresholdMobile: 28,
  snapReleaseMobile: 28,
  longPressMs: 550,
  clickThreshold: 12,
  ballSize: 72,
  ballSizeMobile: 56,
  panelWidth: 200,
  panelHeight: 84,
};

let root = null;
let faceEl = null;
let panelEl = null;
let dateEl = null;
let fullTimeEl = null;

let posX = 0;
let posY = 0;
let isOpen = false;
let isMobile = false;
let dragging = false;
let wasDragging = false;
let lastDockSide = null;
let originX = 0;
let originY = 0;
let startClientX = 0;
let startClientY = 0;
let expandLeft = false;
let expandDown = false;

let gesture = null;
let drag = null;
let snap = null;
let clockApi = null;
let eventsBound = false;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function loadPos() {
  try {
    const s = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "{}");
    if (s.x != null && s.y != null) {
      posX = s.x;
      posY = s.y;
    }
  } catch (e) {}
}

function savePos() {
  try {
    localStorage.setItem(
      CONFIG.storageKey,
      JSON.stringify({ x: posX, y: posY })
    );
  } catch (e) {}
}

function ballSizeNow() {
  return isMobile || window.innerWidth <= 600
    ? CONFIG.ballSizeMobile
    : CONFIG.ballSize;
}

/**
 * bottom 锚定的元素增高默认往上长；expand-down 时由 ExpandPolicy 给出 Y 补偿。
 */
function applyTransform() {
  if (!root) return;
  var y =
    posY +
    expandDownTranslateY(
      isOpen,
      expandDown,
      ballSizeNow(),
      CONFIG.panelHeight
    );
  root.style.transform = "translate(" + posX + "px," + y + "px)";
}

function clampPosition(x, y) {
  if (!root) return [x, y];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = isOpen ? CONFIG.panelWidth : root.offsetWidth || CONFIG.ballSize;
  const h = root.offsetHeight || CONFIG.ballSize;
  const style = getComputedStyle(root);
  const leftBase = parseFloat(style.left) || 20;
  const bottomBase = parseFloat(style.bottom) || 20;
  const margin = 8;
  const minX = margin - leftBase;
  const maxX = vw - w - margin - leftBase;
  const minY = -(vh - h - margin - bottomBase);
  const maxY = margin - bottomBase;
  return [clamp(x, minX, maxX), clamp(y, minY, maxY)];
}

/**
 * Host only measures geometry + applies classes.
 * Decision lives in ExpandPolicy (shared by any Widget).
 */
function updateExpandDirection(force) {
  // 展开期间锁定方向，避免测量反馈导致抽搐
  if (isOpen && !force) return;
  if (!root || dragging) {
    expandLeft = false;
    expandDown = false;
    root.classList.remove("expand-left", "expand-down");
    return;
  }

  const rect = root.getBoundingClientRect();
  const ballH = ballSizeNow();
  const ballW = ballH; // clock ball is square
  // When already open, recover approximate ball top for stable policy input
  var absTop;
  if (isOpen) {
    absTop = expandDown ? rect.top : rect.bottom - ballH;
  } else {
    absTop = rect.top;
  }
  var absLeft = rect.left;
  // When open + expand-left, rect.left is panel left; ball left ≈ rect.right - ballW
  if (isOpen && expandLeft) {
    absLeft = rect.right - ballW;
  }

  const result = resolveExpandDirection({
    absLeft: absLeft,
    absTop: absTop,
    ballW: ballW,
    ballH: ballH,
    openW: CONFIG.panelWidth,
    openH: CONFIG.panelHeight,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    dockSide: lastDockSide,
    pad: 12,
  });

  expandLeft = result.expandLeft;
  expandDown = result.expandDown;
  root.classList.toggle("expand-left", expandLeft);
  root.classList.toggle("expand-down", expandDown);
}

function ensureSnap() {
  if (snap) return snap;
  snap = createSnap(
    {
      snapThreshold: CONFIG.snapThreshold,
      snapRelease: CONFIG.snapRelease,
      snapThresholdMobile: CONFIG.snapThresholdMobile,
      snapReleaseMobile: CONFIG.snapReleaseMobile,
      ballSize: CONFIG.ballSize,
      ballSizeMobile: CONFIG.ballSizeMobile,
    },
    {
      isMobile: function () {
        return isMobile || window.innerWidth <= 600;
      },
      getRoot: function () {
        return root;
      },
      getPosX: function () {
        return posX;
      },
      getPosY: function () {
        return posY;
      },
      setPosition: function (x, y) {
        posX = x;
        posY = y;
        applyTransform();
      },
      clampPosition: clampPosition,
      onSnapSide: function (side) {
        lastDockSide = side;
        if (root) {
          root.classList.toggle("is-docked", !!side);
          root.classList.toggle("dock-left", side === "left");
          root.classList.toggle("dock-right", side === "right");
        }
        savePos();
      },
      onSnappingStart: function () {
        if (root) root.classList.add("is-snapping");
      },
      onSnappingEnd: function () {
        if (root) root.classList.remove("is-snapping");
      },
      onMagnetChange: function (side) {
        if (!root) return;
        if (side) {
          root.classList.add("is-magnet");
          root.classList.toggle("magnet-left", side === "left");
          root.classList.toggle("magnet-right", side === "right");
        } else {
          root.classList.remove("is-magnet", "magnet-left", "magnet-right");
        }
      },
    }
  );
  return snap;
}

function ensureDrag() {
  if (drag) return drag;
  drag = createDrag({
    getPosition: function () {
      return { x: posX, y: posY };
    },
    setPosition: function (x, y) {
      posX = x;
      posY = y;
      applyTransform();
    },
    clampPosition: clampPosition,
    applyMagneticX: function (freeX, clientX, session) {
      return ensureSnap().applyMagneticX(freeX, clientX, session);
    },
  });
  return drag;
}

function setOpen(open) {
  open = !!open;
  if (!root) {
    isOpen = open;
    return;
  }
  if (open === isOpen) return;

  if (open) {
    updateExpandDirection(true);
    // 方向 class 先于 is-open，减少闪一帧错误方向
    root.classList.toggle("expand-left", expandLeft);
    root.classList.toggle("expand-down", expandDown);
    isOpen = true;
    root.classList.add("is-open");
    applyTransform();
  } else {
    isOpen = false;
    root.classList.remove("is-open");
    applyTransform();
    window.setTimeout(function () {
      if (!isOpen && root) {
        root.classList.remove("expand-left", "expand-down");
        expandLeft = false;
        expandDown = false;
      }
    }, 320);
  }
}

function ensureGesture() {
  if (gesture) return gesture;
  gesture = createGesture(
    {
      longPressMs: CONFIG.longPressMs,
      clickThreshold: CONFIG.clickThreshold,
      longPressTapMax: 20,
    },
    {
      onToggle: function () {
        // Desktop: hover open/close. Mobile: tap toggle.
        if (!isMobile) return;
        setOpen(!isOpen);
      },
      onLongPressTap: function (e) {
        // Mobile / touch: long-press stay → Orbit launcher
        var touch =
          (e && (e.pointerType === "touch" || e.pointerType === "pen")) ||
          isMobile ||
          window.innerWidth <= 600;
        if (!touch) return;
        if (window.Orbit && typeof window.Orbit.openLauncher === "function") {
          window.Orbit.openLauncher();
        }
      },
      onDragStart: function () {
        wasDragging = true;
        dragging = true;
        setOpen(false);
        // keep lastDockSide until snap decides; clear visual dock while free-dragging
        if (root) {
          root.classList.add("is-dragging");
          root.classList.remove(
            "is-docked",
            "dock-left",
            "dock-right",
            "expand-left",
            "expand-down"
          );
        }
        lastDockSide = null;
        expandLeft = false;
        expandDown = false;
        ensureDrag().begin({ x: posX, y: posY });
        originX = posX;
        originY = posY;
        const pid = gesture.getActivePointer();
        try {
          if (root && pid != null) root.setPointerCapture(pid);
        } catch (e) {}
      },
      isBlocked: function () {
        return false;
      },
    }
  );
  return gesture;
}

function createDOM() {
  let el = document.getElementById("fwf-clock");
  if (el) {
    if (!document.body.contains(el)) document.body.appendChild(el);
    return el;
  }
  el = document.createElement("div");
  el.id = "fwf-clock";
  el.className = "fwf-clock";
  el.style.cssText =
    "position:fixed;left:20px;bottom:20px;z-index:99998;display:block;visibility:visible;opacity:1;pointer-events:auto;box-sizing:border-box";
  el.innerHTML =
    '<div class="fwf-clock-face" id="fwf-clock-face">--:--</div>' +
    '<div class="fwf-clock-panel" id="fwf-clock-panel">' +
    '<div class="fwf-clock-full" id="fwf-clock-full">--:--:--</div>' +
    '<div class="fwf-clock-date" id="fwf-clock-date">—</div>' +
    "</div>";
  document.body.appendChild(el);
  return el;
}

function endDragSession(commitSnap) {
  const g = ensureGesture();
  const d = ensureDrag();
  const pid = g.getActivePointer();
  document.removeEventListener("pointermove", onMove);
  document.removeEventListener("pointerup", onUp);
  document.removeEventListener("pointercancel", onUp);
  if (pid != null && root) {
    try {
      if (root.hasPointerCapture && root.hasPointerCapture(pid)) {
        root.releasePointerCapture(pid);
      }
    } catch (e) {}
  }
  const wasDrag = wasDragging || dragging || g.isDragging() || d.isActive();
  g.cancel();
  d.end();
  dragging = false;
  if (root) root.classList.remove("is-dragging");
  if (wasDrag && commitSnap) ensureSnap().snapToEdge();
  wasDragging = false;
  return wasDrag;
}

function onDown(e) {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const g = ensureGesture();
  if (g.getActivePointer() != null) return;
  if (e.pointerType === "touch" || e.pointerType === "pen") {
    try {
      e.preventDefault();
    } catch (err) {}
  }
  ensureSnap().clearMagnet();
  wasDragging = false;
  dragging = false;
  const start = g.onPointerDown(e);
  if (!start) return;
  startClientX = start.startClientX;
  startClientY = start.startClientY;
  originX = posX;
  originY = posY;
  document.addEventListener("pointermove", onMove, { passive: false });
  document.addEventListener("pointerup", onUp, { passive: false });
  document.addEventListener("pointercancel", onUp, { passive: false });
}

function onMove(e) {
  const g = ensureGesture();
  const d = ensureDrag();
  if (e.pointerType === "mouse" && e.buttons === 0) {
    return endDragSession(true);
  }
  const phase = g.onPointerMove(e);
  if (phase === "ignore") return;
  if (g.isDragging()) {
    dragging = true;
    wasDragging = true;
  }
  const start = g.getStart();
  startClientX = start.x;
  startClientY = start.y;
  if (!g.isDragging() && !d.isActive()) return;
  e.preventDefault();
  if (!d.isActive()) {
    d.begin({ x: posX, y: posY });
  }
  d.move(e.clientX - startClientX, e.clientY - startClientY, e.clientX, {
    startClientX: startClientX,
    x: startClientX,
  });
}

function onUp(e) {
  const g = ensureGesture();
  const pid = g.getActivePointer();
  if (pid == null || e.pointerId !== pid) return;
  const wasDrag = wasDragging || dragging || g.isDragging();
  // Must handle toggle / long-press-tap BEFORE endDragSession → cancel()
  if (!wasDrag) {
    g.onPointerUp(e, { wasDragging: false, pointerId: pid });
  }
  endDragSession(true);
  try {
    e.preventDefault();
    e.stopPropagation();
  } catch (err) {}
}

function onDocPointerDown(e) {
  // Mobile: tap outside to close. Desktop uses mouseleave.
  if (!isMobile) return;
  if (!isOpen || dragging) return;
  if (root && root.contains(e.target)) return;
  setOpen(false);
}

function onMouseEnter() {
  if (isMobile || dragging) return;
  setOpen(true);
}

function onMouseLeave(e) {
  if (isMobile || dragging) return;
  const related = e && e.relatedTarget;
  if (related && root && root.contains(related)) return;
  setOpen(false);
}

function bindEvents() {
  if (!root || eventsBound) return;
  eventsBound = true;
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
  });
  root.addEventListener("mouseenter", onMouseEnter);
  root.addEventListener("mouseleave", onMouseLeave);
  document.addEventListener("pointerdown", onDocPointerDown, true);
  window.addEventListener("resize", function () {
    isMobile = window.innerWidth <= 600;
    const pair = clampPosition(posX, posY);
    posX = pair[0];
    posY = pair[1];
    applyTransform();
    if (isOpen) updateExpandDirection(true);
  });
}

function init() {
  if (!document.body) {
    setTimeout(init, 50);
    return;
  }
  isMobile = window.innerWidth <= 600;
  loadPos();
  root = createDOM();
  faceEl = document.getElementById("fwf-clock-face");
  panelEl = document.getElementById("fwf-clock-panel");
  dateEl = document.getElementById("fwf-clock-date");
  fullTimeEl = document.getElementById("fwf-clock-full");
  applyTransform();
  bindEvents();

  // mount Clock widget content (must use name `mount` — bundler strips import aliases)
  clockApi = mount({
    root: root,
    refs: {
      face: faceEl,
      panel: panelEl,
      dateEl: dateEl,
      fullTimeEl: fullTimeEl,
    },
    options: { intervalMs: 1000, showSeconds: false },
  });
}

function boot() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
function startClockWidget() {
  boot();
}
__mod.boot = boot;
__mod.init = init;

if (typeof startClockWidget !== 'undefined') __mod.startClockWidget = startClockWidget;
if (typeof boot !== 'undefined') __mod.boot = boot;
if (typeof init !== 'undefined') __mod.init = init;

};

/* ---- src/entry-clock.js ---- */
__modules["src/entry-clock.js"] = function (__mod, __require) {
var __dep0 = __require("src/host/clock-host.js");
var startClockWidget = __dep0.startClockWidget;
/**
 * Clock widget entry — bundle to dist/floating-widget-clock.js
 */

startClockWidget();


};

__require("src/entry-clock.js");
})();
