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
export function createDrag(ctx) {
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
