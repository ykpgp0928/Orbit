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
export function createSnap(config, ctx) {
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
