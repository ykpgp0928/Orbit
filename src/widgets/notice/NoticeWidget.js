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
 * Config (optional): window.ORBIT.notice = { title, text }
 *   - title:  card heading (default "公告")
 *   - text:   announcement text; CONFIG WINS over anything saved in
 *             profile, so theme updates always take effect
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

    const root = document.createElement("div");
    root.id = "orbit-notice";
    root.className = "orbit-notice";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "站点公告");
    root.style.cssText =
      "position:fixed;top:20px;right:20px;z-index:99989;width:min(280px,88vw);" +
      "border-radius:12px;background:#0f172a;color:#e2e8f0;" +
      "font:13px/1.6 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.28);" +
      "overflow:hidden";

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
        return { title: title, text: text };
      },
    };
  },
};
