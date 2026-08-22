/**
 * Orbit Notice Widget — third official widget (M3)
 *
 * A collapsible site-notice card. Deliberately heterogeneous vs Music
 * (audio) and Clock (time): pure content + dismiss state, proving the
 * Contract does not bind the widget to any business domain.
 *
 * Uses Contract services:
 *   - ctx.lifecycle  — all listeners/cleanup registered here
 *   - ctx.profile    — remembers dismissal (per-widget namespace)
 *   - ctx.visibility — hide ≠ destroy (dismissed stays mounted, Runtime can re-show)
 *   - ctx.launcher   — available but not required
 *
 * Config (optional): window.ORBIT.notice = { title, text, position, top, right, bottom, left, offset, zIndex }
 *   - title / text: 公告标题与正文（配置优先于 profile）
 *   - position: 预设位置 top-left | top-right | top-center |
 *               bottom-left | bottom-right | bottom-center（默认 top-right）
 *   - top / right / bottom / left: 自定义边距（number 视为 px，或 CSS 长度字符串）；
 *     写出的边会覆盖预设对应边，并对轴使用 auto 清掉对边
 *   - offset: 预设四角时的统一边距（number → px），默认 20
 *   - zIndex: 可选，默认 99989
 *
 * Close (×) behavior: hides the card AND asks the Runtime to set the
 * instance's visibility to false — the Launcher switch flips to OFF and the
 * preference is persisted (orbit-visible-v1), so a later page load keeps the
 * notice closed until the user re-enables it from the Launcher.
 */

function readConfig() {
  if (typeof window === "undefined" || !window.ORBIT) return {};
  const n = window.ORBIT.notice;
  return n && typeof n === "object" ? n : {};
}

/** @param {unknown} v @returns {string | null} */
function cssLen(v) {
  if (typeof v === "number" && isFinite(v)) return v + "px";
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

/**
 * Resolve fixed-position insets from ORBIT.notice.
 * Config is站长意图：只读配置，不写回 profile。
 * @param {object} cfg
 * @returns {{ top: string, right: string, bottom: string, left: string, transform: string, zIndex: string }}
 */
function resolvePosition(cfg) {
  const offsetRaw = cfg.offset;
  const edge =
    typeof offsetRaw === "number" && isFinite(offsetRaw)
      ? offsetRaw + "px"
      : typeof offsetRaw === "string" && offsetRaw.trim()
        ? offsetRaw.trim()
        : "20px";

  const presets = {
    "top-left": {
      top: edge,
      left: edge,
      right: "auto",
      bottom: "auto",
      transform: "",
    },
    "top-right": {
      top: edge,
      right: edge,
      left: "auto",
      bottom: "auto",
      transform: "",
    },
    "top-center": {
      top: edge,
      left: "50%",
      right: "auto",
      bottom: "auto",
      transform: "translateX(-50%)",
    },
    "bottom-left": {
      bottom: edge,
      left: edge,
      top: "auto",
      right: "auto",
      transform: "",
    },
    "bottom-right": {
      bottom: edge,
      right: edge,
      top: "auto",
      left: "auto",
      transform: "",
    },
    "bottom-center": {
      bottom: edge,
      left: "50%",
      top: "auto",
      right: "auto",
      transform: "translateX(-50%)",
    },
  };

  const key =
    typeof cfg.position === "string" && presets[cfg.position]
      ? cfg.position
      : "top-right";
  const base = presets[key];

  let top = base.top;
  let right = base.right;
  let bottom = base.bottom;
  let left = base.left;
  let transform = base.transform;

  const t = cssLen(cfg.top);
  const r = cssLen(cfg.right);
  const b = cssLen(cfg.bottom);
  const l = cssLen(cfg.left);

  // Explicit edges override preset; clear the opposite side on that axis.
  if (t != null) {
    top = t;
    bottom = "auto";
  }
  if (b != null) {
    bottom = b;
    top = "auto";
  }
  if (l != null) {
    left = l;
    right = "auto";
    if (transform.indexOf("translateX") >= 0) transform = "";
  }
  if (r != null) {
    right = r;
    left = "auto";
    if (transform.indexOf("translateX") >= 0) transform = "";
  }

  let zIndex = "99989";
  if (typeof cfg.zIndex === "number" && isFinite(cfg.zIndex)) {
    zIndex = String(cfg.zIndex);
  } else if (typeof cfg.zIndex === "string" && cfg.zIndex.trim()) {
    zIndex = cfg.zIndex.trim();
  }

  return { top: top, right: right, bottom: bottom, left: left, transform: transform, zIndex: zIndex };
}

export const noticeWidgetDefinition = {
  id: "notice",
  version: "0.4",
  label: "Notice 公告",
  // M4 fix: NOT default-on — the docs require listing notice in
  // ORBIT.widgets explicitly; defaultWidgets() respects this.
  defaultVisible: false,
  capabilities: {
    launcher: true,
    profile: true,
  },
  mount: function (ctx) {
    const cfg = readConfig();
    const saved = ctx.profile.get() || {};
    // Config is the author's intent and wins; profile text is only a
    // fallback for the previous message before any config existed.
    const title =
      typeof cfg.title === "string" && cfg.title ? cfg.title : "公告";
    const text =
      typeof cfg.text === "string" && cfg.text
        ? cfg.text
        : typeof saved.text === "string" && saved.text
          ? saved.text
          : "站点公告：欢迎使用 Orbit 悬浮组件。";

    const pos = resolvePosition(cfg);

    const root = document.createElement("div");
    root.id = "orbit-notice";
    root.className = "orbit-notice";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "站点公告");
    root.style.cssText =
      "position:fixed;" +
      "top:" +
      pos.top +
      ";" +
      "right:" +
      pos.right +
      ";" +
      "bottom:" +
      pos.bottom +
      ";" +
      "left:" +
      pos.left +
      ";" +
      (pos.transform ? "transform:" + pos.transform + ";" : "") +
      "z-index:" +
      pos.zIndex +
      ";" +
      "width:min(280px,88vw);" +
      "border-radius:12px;background:#0f172a;color:#e2e8f0;" +
      "font:13px/1.6 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);" +
      "overflow:hidden;box-sizing:border-box";

    const head = document.createElement("div");
    head.className = "orbit-notice-head";
    head.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;" +
      "padding:8px 12px;background:rgba(255,255,255,.06);font-weight:600";
    const titleEl = document.createElement("span");
    titleEl.className = "orbit-notice-title";
    titleEl.textContent = title; // textContent: config never becomes markup
    head.appendChild(titleEl);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "orbit-notice-close";
    closeBtn.setAttribute("aria-label", "关闭公告");
    closeBtn.textContent = "×";
    closeBtn.style.cssText =
      "border:0;background:transparent;color:inherit;cursor:pointer;" +
      "font:inherit;line-height:1;padding:2px 6px;border-radius:6px";
    head.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "orbit-notice-body";
    body.style.cssText = "padding:10px 12px";
    body.textContent = text;

    root.appendChild(head);
    root.appendChild(body);
    document.body.appendChild(root);

    const onClose = function () {
      try {
        ctx.profile.set({ title: title, text: text, dismissed: true });
      } catch (e) {}
      // Ask the Runtime to hide us + flip the Launcher switch + persist the
      // preference. Falls back to direct DOM hiding for standalone use.
      if (ctx.instance && typeof ctx.instance.setVisible === "function") {
        ctx.instance.setVisible(false);
      } else {
        ctx.visibility.setVisible(root, false);
      }
    };
    ctx.lifecycle.add(function () {
      closeBtn.removeEventListener("click", onClose);
    });
    closeBtn.addEventListener("click", onClose);

    ctx.lifecycle.add(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    });

    return {
      root: root,
      setVisible: function (visible) {
        ctx.visibility.setVisible(root, !!visible);
      },
      destroy: function () {
        ctx.lifecycle.dispose();
      },
      snapshot: function () {
        return {
          title: title,
          text: text,
          position: {
            top: pos.top,
            right: pos.right,
            bottom: pos.bottom,
            left: pos.left,
          },
        };
      },
    };
  },
};
