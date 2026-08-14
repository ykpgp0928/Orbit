/**
 * Orbit Phase C — one-time launcher hotkey hint when ≥2 widgets.
 */

const STYLE_ID = "orbit-launcher-hint-style";
const STORAGE_KEY = "orbit-launcher-hint-v1";
const HINT_ID = "orbit-launcher-hint";
const SHOW_MS = 5200;

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
#orbit-launcher-hint{
  position:fixed;z-index:100001;
  right:16px;bottom:16px;
  max-width:min(320px,calc(100vw - 32px));
  padding:12px 14px;
  border-radius:12px;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  font-size:13px;line-height:1.45;
  color:#0f172a;
  background:#f8fafc;
  border:1px solid rgba(15,23,42,.1);
  box-shadow:0 12px 32px rgba(15,23,42,.18);
  opacity:0;transform:translateY(8px);
  transition:opacity .2s ease,transform .2s ease;
  pointer-events:auto;
}
#orbit-launcher-hint.is-show{
  opacity:1;transform:translateY(0);
}
@media (prefers-color-scheme:dark){
  #orbit-launcher-hint{
    color:#f1f5f9;background:#1e293b;
    border-color:rgba(148,163,184,.25);
  }
}
#orbit-launcher-hint .olh-row{display:flex;gap:10px;align-items:flex-start}
#orbit-launcher-hint .olh-text{flex:1;min-width:0}
#orbit-launcher-hint .olh-title{font-weight:700;margin:0 0 4px;font-size:13px}
#orbit-launcher-hint .olh-body{margin:0;opacity:.8;font-size:12px}
#orbit-launcher-hint .olh-kbd{
  display:inline-block;font-family:ui-monospace,monospace;
  font-size:11px;padding:1px 6px;border-radius:4px;
  background:rgba(148,163,184,.25);
}
#orbit-launcher-hint .olh-close{
  flex-shrink:0;border:0;background:transparent;cursor:pointer;
  font-size:16px;line-height:1;opacity:.5;padding:0 2px;color:inherit;
}
#orbit-launcher-hint .olh-close:hover{opacity:.9}
@media (prefers-reduced-motion:reduce){
  #orbit-launcher-hint{transition:none}
}
`;
  document.head.appendChild(s);
}

function storageGet() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function storageSet() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch (e) {}
}

/**
 * @param {object} opts
 * @param {() => string} opts.getLauncherKey
 * @param {() => number} opts.getWidgetCount — registered hosts or visible instances
 * @param {boolean} opts.enabled
 */
export function maybeShowLauncherHint(opts) {
  if (typeof document === "undefined") return;
  if (!opts || opts.enabled === false) return;
  if (storageGet()) return;
  const n = typeof opts.getWidgetCount === "function" ? opts.getWidgetCount() : 0;
  if (n < 2) return;

  ensureStyles();
  if (document.getElementById(HINT_ID)) return;

  const key = (opts.getLauncherKey && opts.getLauncherKey()) || "Alt+O";
  const coarse =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;
  const el = document.createElement("div");
  el.id = HINT_ID;
  el.setAttribute("role", "status");
  const body = coarse
    ? "在手机上<strong>长按</strong>任意悬浮球（不要滑动）可打开管理面板，开关各组件。本提示只显示一次。"
    : "按 <span class=\"olh-kbd\"></span> 可打开面板；手机可长按悬浮球。本提示只显示一次。";
  el.innerHTML =
    '<div class="olh-row">' +
    '<div class="olh-text">' +
    '<p class="olh-title">Orbit 组件管理</p>' +
    '<p class="olh-body">' + body + "</p>" +
    "</div>" +
    '<button type="button" class="olh-close" aria-label="关闭">×</button>' +
    "</div>";
  const kbd = el.querySelector(".olh-kbd");
  if (kbd) kbd.textContent = key;

  function dismiss() {
    storageSet();
    el.classList.remove("is-show");
    window.setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }

  el.querySelector(".olh-close").addEventListener("click", dismiss);
  document.body.appendChild(el);
  requestAnimationFrame(function () {
    el.classList.add("is-show");
  });
  window.setTimeout(dismiss, SHOW_MS);
}

export function resetLauncherHintForDebug() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
