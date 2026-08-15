/**
 * Orbit Phase 5 — mobile zero-visible fallback entry (ghost)
 * Not a Widget: no drag, not in Launcher list, no position storage.
 */

const STYLE_ID = "orbit-fallback-style";
const BTN_ID = "orbit-launcher-fallback";

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
#${BTN_ID}{
  position:fixed;
  right:max(12px, env(safe-area-inset-right));
  bottom:max(12px, env(safe-area-inset-bottom));
  z-index:99990;
  width:48px;height:48px;min-width:44px;min-height:44px;
  border:none;border-radius:999px;
  padding:0;margin:0;
  cursor:pointer;
  background:rgba(15,23,42,.72);
  color:#f8fafc;
  font-size:18px;line-height:1;
  box-shadow:0 4px 16px rgba(0,0,0,.25);
  display:flex;
  align-items:center;justify-content:center;
  -webkit-tap-highlight-color:transparent;
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  transform:scale(0.85);
  transition:opacity .22s ease, transform .22s ease, visibility .22s ease;
}
#${BTN_ID}.is-visible{
  opacity:1;
  visibility:visible;
  pointer-events:auto;
  transform:scale(1);
}
#${BTN_ID}:focus-visible{
  outline:2px solid #38bdf8;outline-offset:3px;
}
@media (prefers-color-scheme:light){
  #${BTN_ID}{background:rgba(15,23,42,.82)}
}
`;
  document.head.appendChild(s);
}

function isCoarsePointer() {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
  } catch (e) {}
  return window.innerWidth <= 600;
}

/**
 * @param {object} orbitApi
 * @param {() => string} getMode — 'ghost' | 'host-button' | 'none'
 */
export function createLauncherFallback(orbitApi, getMode) {
  let btn = null;

  function visibleWidgetCount() {
    const rows = orbitApi.list() || [];
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].visible) n += 1;
    }
    return n;
  }

  function ensureBtn() {
    ensureStyles();
    if (btn && document.body.contains(btn)) return btn;
    btn = document.getElementById(BTN_ID);
    if (!btn) {
      btn = document.createElement("button");
      btn.id = BTN_ID;
      btn.type = "button";
      btn.setAttribute("aria-label", "管理 Orbit 组件");
      btn.title = "管理 Orbit 组件";
      btn.textContent = "◎";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (orbitApi.openLauncher) {
          orbitApi.openLauncher(btn);
        } else if (orbitApi.toggleLauncher) {
          orbitApi.toggleLauncher();
        }
      });
      document.body.appendChild(btn);
    }
    return btn;
  }

  function sync() {
    const mode = (getMode && getMode()) || "ghost";
    if (mode === "none" || mode === "host-button") {
      if (btn) btn.classList.remove("is-visible");
      return;
    }
    // ghost: only coarse + zero visible widgets
    const show = isCoarsePointer() && visibleWidgetCount() === 0;
    const el = ensureBtn();
    if (show) el.classList.add("is-visible");
    else el.classList.remove("is-visible");
  }

  return { sync: sync, ensureBtn: ensureBtn };
}
