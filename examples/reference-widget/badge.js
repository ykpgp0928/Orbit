/**
 * Orbit Reference Widget — "Status Badge" (Contract Alpha walking skeleton)
 *
 * Written as an EXTERNAL author would: only the public `window.Orbit`
 * surface, no imports from the runtime source tree, no Orbit private CSS
 * classes, no window/document-level global listeners of its own.
 *
 * Walk-through: register → mount(ctx) → profile read/write → portal claim
 *              → launcher metadata → setVisible → destroy → remount.
 *
 * Load AFTER dist/orbit.js (defer order matters).
 */
(function () {
  "use strict";

  if (!window.Orbit || typeof window.Orbit.register !== "function") {
    console.error("[ref-badge] Orbit runtime not found — load dist/orbit.js first");
    return;
  }

  window.Orbit.register({
    id: "example-status",
    version: "0.4",
    label: "Status 状态",
    capabilities: {
      launcher: true,
      profile: true,
      portal: true,
      // draggable/dockable stay OUT of the v0.4 mandatory surface (M2 scope)
    },

    mount: function (ctx) {
      // ---- business DOM (own styles only) ----
      var root = document.createElement("div");
      root.id = "example-status";
      root.className = "ref-badge";
      root.style.cssText =
        "position:fixed;left:140px;bottom:20px;z-index:99990;" +
        "padding:8px 14px;border-radius:999px;background:#334155;color:#f1f5f9;" +
        "font:600 13px/1 system-ui,sans-serif;cursor:pointer;" +
        "box-shadow:0 4px 12px rgba(0,0,0,.25);user-select:none";
      var text = document.createElement("span");
      text.className = "ref-badge-text";
      text.textContent = "Orbit 0.4";
      root.appendChild(text);
      document.body.appendChild(root);

      // ---- portal (body-level sheet, claimed so Runtime hides/removes it) ----
      var sheet = document.createElement("div");
      sheet.id = "example-status-sheet";
      sheet.className = "ref-badge-sheet";
      sheet.setAttribute("role", "status");
      sheet.style.cssText =
        "position:fixed;right:20px;bottom:20px;z-index:99991;" +
        "padding:12px 16px;border-radius:10px;background:#1e293b;color:#e2e8f0;" +
        "font:12px/1.6 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)";
      sheet.textContent = "Status sheet — claimed portal (hidden with the badge, removed on destroy)";
      document.body.appendChild(sheet);
      ctx.portal.claim(sheet);

      // ---- profile: per-widget-id namespaced persistence ----
      var saved = ctx.profile.get() || {};
      var clicks = typeof saved.clicks === "number" ? saved.clicks : 0;
      var render = function () {
        text.textContent = "Clicks: " + clicks;
        sheet.textContent = "Status sheet — clicks so far: " + clicks;
      };
      render();

      // ---- business listeners go through ctx.lifecycle ----
      var onClick = function () {
        clicks += 1;
        render();
        ctx.profile.set({ clicks: clicks });
      };
      ctx.lifecycle.add(function () {
        root.removeEventListener("click", onClick);
      });
      root.addEventListener("click", onClick);

      // ---- WidgetInstance ----
      return {
        root: root,
        setVisible: function (visible) {
          ctx.visibility.setVisible(root, visible);
          ctx.visibility.setVisible(sheet, visible);
        },
        destroy: function () {
          ctx.lifecycle.dispose(); // removes listener; Runtime removes portals + roots
        },
        snapshot: function () {
          return { clicks: clicks };
        },
      };
    },
  });
})();
