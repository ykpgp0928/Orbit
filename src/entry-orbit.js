/**
 * Orbit Runtime entry — Phase 4 / M3
 * All widgets are Contract registrations (register → mount → destroy →
 * visibility → Profile); the Runtime has zero hardcoded widget ids.
 */
import { Orbit } from "./core/Orbit.js";
import { musicWidgetDefinition } from "./host/music-player-host.js";
import { clockWidgetDefinition } from "./host/clock-host.js";
import { noticeWidgetDefinition } from "./widgets/notice/NoticeWidget.js";

Orbit.register(musicWidgetDefinition);
Orbit.register(clockWidgetDefinition);
Orbit.register(noticeWidgetDefinition);

if (typeof window !== "undefined") {
  window.Orbit = Orbit;
  const boot = function () {
    Orbit.mount(
      typeof window.ORBIT === "object" && window.ORBIT ? window.ORBIT : {}
    );
  };
  // M2: wait for DOMContentLoaded even when defer scripts run at
  // readyState "interactive" — guarantees all register() calls from other
  // defer scripts (Contract widgets) ran before mount() reads ORBIT.widgets.
  if (document.readyState === "loading" || document.readyState === "interactive") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}

export { Orbit };
