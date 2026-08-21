/**
 * Orbit Launcher — panel + hotkey (default Alt+O)
 * Open/close: light opacity + translate (no heavy backdrop-filter)
 */

const STYLE_ID = "orbit-launcher-style";
const ROOT_ID = "orbit-launcher";
const ANIM_MS = 180;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
#orbit-launcher{
  position:fixed;inset:0;z-index:100000;
  display:flex;align-items:center;justify-content:center;
  font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
  pointer-events:none;opacity:0;
  transition:opacity ${ANIM_MS}ms ease;
}
#orbit-launcher.is-open{
  pointer-events:auto;opacity:1;
}
#orbit-launcher .ol-backdrop{
  position:absolute;inset:0;
  background:rgba(15,23,42,.48);
  /* no backdrop-filter — main cause of open/close jank */
  opacity:0;
  transition:opacity ${ANIM_MS}ms ease;
}
#orbit-launcher.is-open .ol-backdrop{opacity:1}
#orbit-launcher .ol-panel{
  position:relative;
  width:min(360px,92vw);
  max-height:min(80vh,480px);
  overflow:auto;
  border-radius:16px;
  padding:18px 18px 14px;
  background:#f8fafc;
  color:#0f172a;
  border:1px solid rgba(15,23,42,.08);
  box-shadow:0 16px 40px rgba(15,23,42,.22);
  opacity:0;
  transform:translateY(8px);
  transition:opacity ${ANIM_MS}ms ease, transform ${ANIM_MS}ms ease;
}
#orbit-launcher.is-open .ol-panel{
  opacity:1;
  transform:translateY(0);
}
@media (prefers-color-scheme:dark){
  #orbit-launcher .ol-panel{
    background:#1e293b;
    color:#f1f5f9;
    border-color:rgba(148,163,184,.2);
  }
  #orbit-launcher .ol-backdrop{background:rgba(2,6,23,.62)}
}
@media (prefers-reduced-motion:reduce){
  #orbit-launcher,
  #orbit-launcher .ol-backdrop,
  #orbit-launcher .ol-panel,
  #orbit-launcher .ol-slider,
  #orbit-launcher .ol-slider:before{transition:none !important}
}
#orbit-launcher .ol-title{margin:0 0 4px;font-size:1.1rem;font-weight:700}
#orbit-launcher .ol-title:focus{outline:none}
#orbit-launcher .ol-title:focus-visible{outline:2px solid #38bdf8;outline-offset:2px}
#orbit-launcher .ol-panel:focus{outline:none}

#orbit-launcher .ol-sub{margin:0 0 14px;font-size:12px;opacity:.65}
#orbit-launcher .ol-row{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:10px 6px;border-top:1px solid rgba(148,163,184,.25);
  border-radius:8px;margin:0 -6px;
}
#orbit-launcher .ol-row:first-of-type{border-top:none}
#orbit-launcher .ol-name{font-size:14px;font-weight:600}
#orbit-launcher .ol-id{font-size:11px;opacity:.55;font-weight:400}
#orbit-launcher .ol-switch{position:relative;width:48px;height:28px;flex-shrink:0}
#orbit-launcher .ol-switch input{opacity:0;width:0;height:0;position:absolute}
#orbit-launcher .ol-slider{
  position:absolute;cursor:pointer;inset:0;
  background:#cbd5e1;border-radius:999px;
  transition:background .2s ease;
}
#orbit-launcher .ol-slider:before{
  position:absolute;content:"";
  height:22px;width:22px;left:3px;bottom:3px;
  background:#fff;border-radius:50%;
  transition:transform .2s ease;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
}
#orbit-launcher .ol-switch input:checked+.ol-slider{background:#38bdf8}
#orbit-launcher .ol-switch input:checked+.ol-slider:before{transform:translateX(20px)}
#orbit-launcher .ol-switch input:focus-visible+.ol-slider{
  outline:2px solid #38bdf8;outline-offset:2px;
}
#orbit-launcher .ol-foot{
  margin-top:12px;font-size:12px;opacity:.55;
  display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;
}
#orbit-launcher .ol-kbd{
  font-family:ui-monospace,monospace;font-size:11px;
  padding:1px 6px;border-radius:4px;background:rgba(148,163,184,.2);
}
#orbit-launcher .ol-empty{font-size:13px;opacity:.7;padding:8px 0}
`;
  document.head.appendChild(s);
}

/**
 * @param {object} orbitApi
 * @param {() => string} getLauncherKey
 */
export function createLauncher(orbitApi, getLauncherKey) {
  let open = false;
  let root = null;
  let listEl = null;
  let bound = false;
  let closeTimer = null;
  /** @type {HTMLElement | null} */
  let lastTrigger = null;

  function formatKey(key) {
    return key || "Alt+O";
  }

  function ensureDom() {
    ensureStyles();
    if (root && document.body.contains(root)) return root;
    root = document.getElementById(ROOT_ID);
    if (!root) {
      root = document.createElement("div");
      root.id = ROOT_ID;
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");
      root.setAttribute("aria-label", "Orbit 组件管理");
      root.setAttribute("aria-hidden", "true");
      root.style.display = "none";
      root.innerHTML =
        '<div class="ol-backdrop" data-ol-close="1"></div>' +
        '<div class="ol-panel" role="document">' +
        '<h2 class="ol-title" tabindex="-1">Orbit 组件</h2>' +
        '<p class="ol-sub">开关各悬浮 Widget 的显示</p>' +
        '<div class="ol-list"></div>' +
        '<div class="ol-foot" data-ol-foot></div>' +
        "</div>";
      document.body.appendChild(root);
      root.addEventListener("click", function (e) {
        const t = e.target;
        if (t && t.getAttribute && t.getAttribute("data-ol-close")) {
          setOpen(false);
        }
      });
    }
    listEl = root.querySelector(".ol-list");
    return root;
  }

  function renderList() {
    ensureDom();
    const key = formatKey(getLauncherKey());
    const foot = root.querySelector("[data-ol-foot]");
    if (foot) {
      if (isCoarsePointer()) {
        foot.innerHTML =
          "<span>长按悬浮球可再次打开</span><span>点遮罩关闭</span>";
      } else {
        foot.innerHTML =
          '<span>快捷键 <span class="ol-kbd">' +
          key +
          "</span></span><span>Esc 关闭</span>";
      }
    }

    const hosts = orbitApi.listHosts();
    const state = {};
    orbitApi.list().forEach(function (row) {
      state[row.id] = row.visible;
    });

    if (!hosts.length) {
      listEl.innerHTML = '<div class="ol-empty">当前没有已注册的 Widget</div>';
      return;
    }

    listEl.innerHTML = hosts
      .map(function (id) {
        // Honest state: only a mounted + visible instance counts as "on".
        // A registered-but-not-mounted widget (not listed in ORBIT.widgets)
        // shows as OFF; toggling it on mounts it.
        const on = state[id] === true;
        // M2: labels come from Contract / adapter metadata — never hardcoded.
        const label =
          typeof orbitApi.getLabel === "function"
            ? orbitApi.getLabel(id)
            : id;
        return (
          '<div class="ol-row" data-id="' +
          escapeHtml(id) +
          '">' +
          '<div><div class="ol-name">' +
          escapeHtml(label) +
          '</div><div class="ol-id">' +
          escapeHtml(id) +
          "</div></div>" +
          '<label class="ol-switch" title="显示 / 隐藏">' +
          '<input type="checkbox" data-ol-toggle="' +
          escapeHtml(id) +
          '"' +
          (on ? " checked" : "") +
          " />" +
          '<span class="ol-slider"></span>' +
          "</label></div>"
        );
      })
      .join("");

    listEl.querySelectorAll("[data-ol-toggle]").forEach(function (input) {
      input.addEventListener("change", function () {
        const id = input.getAttribute("data-ol-toggle");
        orbitApi.setVisible(id, !!input.checked);
      });
    });
  }

  function getFocusables() {
    if (!root) return [];
    const panel = root.querySelector(".ol-panel");
    if (!panel) return [];
    const sel =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(panel.querySelectorAll(sel)).filter(
      function (el) {
        return !el.disabled && el.offsetParent !== null;
      }
    );
  }

  function focusOnOpen() {
    const title = root && root.querySelector(".ol-title");
    if (title && typeof title.focus === "function") {
      try {
        title.focus();
        return;
      } catch (e) {}
    }
    const list = getFocusables();
    if (list.length) {
      try {
        list[0].focus();
      } catch (e) {}
    }
  }

  function restoreFocus() {
    const t = lastTrigger;
    lastTrigger = null;
    if (t && typeof t.focus === "function" && document.contains(t)) {
      try {
        t.focus();
        return;
      } catch (e) {}
    }
    if (document.body && document.body.focus) {
      try {
        document.body.focus();
      } catch (e) {}
    }
  }

  /**
   * @param {boolean} next
   * @param {HTMLElement | Event | null} [trigger]
   */
  function setOpen(next, trigger) {
    next = !!next;
    ensureDom();
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    if (next === open && next) {
      renderList();
      return open;
    }

    if (next) {
      if (trigger && trigger.nodeType === 1) lastTrigger = trigger;
      else if (
        typeof document !== "undefined" &&
        document.activeElement &&
        document.activeElement !== document.body
      ) {
        lastTrigger = document.activeElement;
      }
      open = true;
      root.style.display = "flex";
      root.setAttribute("aria-hidden", "false");
      renderList();
      requestAnimationFrame(function () {
        root.classList.add("is-open");
        focusOnOpen();
      });
    } else {
      open = false;
      root.classList.remove("is-open");
      root.setAttribute("aria-hidden", "true");
      closeTimer = setTimeout(function () {
        if (!open && root) root.style.display = "none";
        closeTimer = null;
        restoreFocus();
      }, ANIM_MS + 20);
    }
    return open;
  }

  function toggle(trigger) {
    return setOpen(!open, trigger);
  }

  function isOpen() {
    return open;
  }

  function matchHotkey(e, keySpec) {
    const spec = (keySpec || "Alt+O").toLowerCase().replace(/\s+/g, "");
    const parts = spec.split("+");
    const needAlt = parts.indexOf("alt") >= 0;
    const needCtrl = parts.indexOf("ctrl") >= 0 || parts.indexOf("control") >= 0;
    const needShift = parts.indexOf("shift") >= 0;
    const needMeta = parts.indexOf("meta") >= 0 || parts.indexOf("cmd") >= 0;
    const keyPart = parts[parts.length - 1];
    if (!!e.altKey !== needAlt) return false;
    if (!!e.ctrlKey !== needCtrl) return false;
    if (!!e.shiftKey !== needShift) return false;
    if (!!e.metaKey !== needMeta) return false;
    const k = (e.key || "").toLowerCase();
    if (keyPart === "o") return k === "o";
    return k === keyPart;
  }

  function onKeyDown(e) {
    if (open && e.key === "Tab") {
      const list = getFocusables();
      if (list.length) {
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
          return;
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
          return;
        }
      }
    }
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (matchHotkey(e, getLauncherKey())) {
      e.preventDefault();
      toggle();
    }
  }

  function bind() {
    if (bound || typeof document === "undefined") return;
    bound = true;
    document.addEventListener("keydown", onKeyDown, true);
  }

  function unbind() {
    if (!bound) return;
    document.removeEventListener("keydown", onKeyDown, true);
    bound = false;
  }

  return {
    toggle: toggle,
    setOpen: setOpen,
    isOpen: isOpen,
    renderList: renderList,
    bind: bind,
    unbind: unbind,
  };
}
