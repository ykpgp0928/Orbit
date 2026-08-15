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
   * Mobile free PANEL open:
   * 1) Prefer expand right if openW fits.
   * 2) Else expand left (margin-left keeps ball edge).
   * 3) If neither side fits, shift horizontally so the open card stays in the viewport.
   * Vertical: clamp so open height stays on screen.
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

    const canExpandRight = absLeft + openW <= vw - pad;
    const canExpandLeft = absLeft + ballW - openW >= pad;

    let expandLeftFlag = false;

    if (canExpandRight) {
      expandLeftFlag = false;
    } else if (canExpandLeft) {
      expandLeftFlag = true;
    } else {
      // Neither side fits without moving — shift so open card is fully in view.
      // Prefer left-expand when ball is on the right half; otherwise right-expand.
      const ballCenter = absLeft + ballW / 2;
      if (ballCenter >= vw / 2) {
        expandLeftFlag = true;
        // expand-left: card left ≈ absLeft + ballW - openW, right ≈ absLeft + ballW
        const minAbs = pad - ballW + openW;
        const maxAbs = vw - pad - ballW;
        absLeft = Math.min(Math.max(absLeft, minAbs), Math.max(minAbs, maxAbs));
      } else {
        expandLeftFlag = false;
        const minAbs = pad;
        const maxAbs = vw - pad - openW;
        absLeft = Math.min(Math.max(absLeft, minAbs), Math.max(minAbs, maxAbs));
      }
      ctx.setPosition(absLeft - leftBase, ctx.getPosY());
    }

    // Vertical clamp for open card height (ball width as footprint X)
    const [cx, cy] = ctx.clampPosition(
      ctx.getPosX(),
      ctx.getPosY(),
      ballW,
      openH
    );
    if (cx !== ctx.getPosX() || cy !== ctx.getPosY()) {
      ctx.setPosition(cx, cy);
    }
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
    // Horizontal side already decided above; ExpandPolicy only for vertical
    setExpandLeft(expandLeftFlag);
    setExpandDown(result.expandDown);
  }

  function updateListDirection() {
    const root = ctx.getRoot();
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const listH =
      parseInt(getComputedStyle(root).getPropertyValue("--mp-list-h"), 10) ||
      280;
    // Default: expand list downward. If not enough space below → upward (bar stays).
    const spaceBelow = window.innerHeight - rect.bottom;
    const need = listH + 16;
    setListUp(spaceBelow < need);
  }

  function getListUp() {
    return listUp;
  }

  function setListUp(v) {
    listUp = !!v;
    if (ctx.onListUp) ctx.onListUp(listUp);
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
