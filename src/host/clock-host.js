/**
 * FWF Clock Host — minimal floating shell + Clock widget
 * Reuses Gesture / Drag / Snap (same interaction language as Music).
 */
import { createGesture } from "../interaction/Gesture.js";
import { createDrag } from "../interaction/Drag.js";
import { createSnap } from "../interaction/Snap.js";
import {
  resolveExpandDirection,
  expandDownTranslateY,
} from "../interaction/ExpandPolicy.js";
import { mount } from "../widgets/clock/ClockWidget.js";

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

export function startClockWidget() {
  boot();
}

export { boot, init };
