/**
 * FWF Interaction — Layout
 *
 * Owns: PANEL expand direction (via ExpandPolicy), mobile card geometry,
 * list-up, dock-down. Does NOT: pointer stream.
 */

import {
  resolveExpandDirection,
  resolveDockStackDirection,
} from "./ExpandPolicy.js";

/**
 * @typedef {Object} LayoutContext
 * @property {() => HTMLElement | null} getRoot
 * @property {() => boolean} isMobile
 * @property {() => boolean} isDocked
 * @property {() => boolean} isDragging
 * @property {() => boolean} isOpen
 * @property {() => number} getPosX
 * @property {() => number} getPosY
 * @property {(x: number, y: number, w?: number, h?: number) => [number, number]} clampPosition
 * @property {(x: number, y: number) => void} setPosition
 * @property {() => number} getBallSize
 * @property {() => "left"|"right"|null} [getDockSide]
 * @property {(expandLeft: boolean) => void} [onExpandLeft]
 * @property {(expandDown: boolean) => void} [onExpandDown]
 * @property {() => void} [sync]
 */

/**
 * @param {LayoutContext} ctx
 */
export function createLayout(ctx) {
  let expandLeft = false;
  let expandDown = false;
  let listUp = false;

  function getExpandLeft() {
    return expandLeft;
  }

  function getExpandDown() {
    return expandDown;
  }

  function setExpandLeft(v) {
    expandLeft = !!v;
    if (ctx.onExpandLeft) ctx.onExpandLeft(expandLeft);
    if (ctx.sync) ctx.sync();
  }

  function setExpandDown(v) {
    expandDown = !!v;
    if (ctx.onExpandDown) ctx.onExpandDown(expandDown);
    if (ctx.sync) ctx.sync();
  }

  function measureOpenWidth(root) {
    let openW = 360;
    try {
      const raw = getComputedStyle(root).getPropertyValue("--mp-width-open").trim();
      if (raw) {
        const d = document.createElement("div");
        d.style.cssText = "position:absolute;visibility:hidden;width:" + raw;
        document.body.appendChild(d);
        openW = d.offsetWidth || openW;
        d.remove();
      }
    } catch (e) {}
    return openW;
  }

  /**
   * Desktop / free PANEL: ExpandPolicy decides left/right (and vertical hint).
   * Docked music UI does not use free-panel expand-left.
   */
  function updateExpandDirection() {
    if (!ctx.getRoot() || ctx.isDocked() || ctx.isDragging()) {
      setExpandLeft(false);
      setExpandDown(false);
      return;
    }
    if (ctx.isMobile() && ctx.isOpen()) return;

    const root = ctx.getRoot();
    const leftBase = parseFloat(getComputedStyle(root).left) || 20;
    const ball = ctx.getBallSize();
    const openW = measureOpenWidth(root);
    const rect = root.getBoundingClientRect();
    const absLeft = leftBase + ctx.getPosX();
    const absTop = rect.top;
    const dockSide =
      typeof ctx.getDockSide === "function" ? ctx.getDockSide() : null;

    const result = resolveExpandDirection({
      absLeft: absLeft,
      absTop: absTop,
      ballW: ball,
      ballH: ball,
      openW: openW,
      openH: Math.max(ball, 80),
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
      dockSide: dockSide,
      pad: 12,
    });

    setExpandLeft(result.expandLeft);
    setExpandDown(result.expandDown);
  }

  function getMobileCardSize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(vw * 0.72, 260);
    const h = Math.min(vh * 0.34, 210);
    return { w: Math.max(180, Math.round(w)), h: Math.max(140, Math.round(h)) };
  }

  /**
   * Mobile free PANEL open: clamp into view, expand side via ExpandPolicy.
   */
  function prepareMobileOpen() {
    if (!ctx.getRoot() || !ctx.isMobile()) return;
    if (ctx.isDocked()) return;

    const { w: openW, h: openH } = getMobileCardSize();
    const root = ctx.getRoot();
    const leftBase = parseFloat(getComputedStyle(root).left) || 20;
    const ballW = ctx.getBallSize();
    const vw = window.innerWidth;
    const pad = 8;
    let absLeft = leftBase + ctx.getPosX();

    // If neither side fits without move, shift so left-expand is possible
    if (
      absLeft + openW > vw - pad &&
      absLeft + ballW - openW < pad
    ) {
      const minAbs = pad - ballW + openW;
      const maxAbs = vw - pad - ballW;
      const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
      absLeft = clamp(
        Math.max(absLeft, minAbs),
        Math.min(minAbs, maxAbs),
        Math.max(minAbs, maxAbs)
      );
      ctx.setPosition(absLeft - leftBase, ctx.getPosY());
    }

    const [cx, cy] = ctx.clampPosition(
      ctx.getPosX(),
      ctx.getPosY(),
      ballW,
      openH
    );
    ctx.setPosition(cx, cy);
    absLeft = leftBase + ctx.getPosX();

    const rect = root.getBoundingClientRect();
    const result = resolveExpandDirection({
      absLeft: absLeft,
      absTop: rect.top,
      ballW: ballW,
      ballH: ballW,
      openW: openW,
      openH: openH,
      viewportW: vw,
      viewportH: window.innerHeight,
      dockSide: null,
      pad: pad,
    });
    setExpandLeft(result.expandLeft);
    setExpandDown(result.expandDown);
  }

  function updateListDirection() {
    const root = ctx.getRoot();
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const listH =
      parseInt(getComputedStyle(root).getPropertyValue("--mp-list-h"), 10) ||
      280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    listUp = spaceBelow < listH + 16 && spaceAbove > spaceBelow;
    if (ctx.sync) ctx.sync();
  }

  function getListUp() {
    return listUp;
  }

  function setListUp(v) {
    listUp = !!v;
    if (ctx.sync) ctx.sync();
  }

  /**
   * Mobile dock button stack: open downward when near top.
   */
  function shouldDockDown() {
    const root = ctx.getRoot();
    if (!root || !ctx.isMobile() || !ctx.isDocked()) return false;
    const rect = root.getBoundingClientRect();
    const n = root.querySelectorAll(".mp-dock-btn").length || 5;
    const stackH = n * 40 + (n - 1) * 8 + 12;
    return resolveDockStackDirection({
      absTop: rect.top,
      absBottom: rect.bottom,
      stackH: stackH,
      viewportH: window.innerHeight,
      pad: 8,
    }).dockDown;
  }

  return {
    getExpandLeft,
    setExpandLeft,
    getExpandDown,
    setExpandDown,
    updateExpandDirection,
    prepareMobileOpen,
    getMobileCardSize,
    updateListDirection,
    getListUp,
    setListUp,
    shouldDockDown,
  };
}
