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
export function resolveExpandDirection(input) {
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
export function resolveDockStackDirection(input) {
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
export function expandDownTranslateY(isOpen, expandDown, ballH, openH) {
  if (isOpen && expandDown) return openH - ballH;
  return 0;
}
