/**
 * Orbit Runtime entry — Phase 4
 * Registers Music + Clock with destroy + visibility targets (no Runtime id hardcode).
 */
import { Orbit } from "./core/Orbit.js";
import {
  startMusicPlayer,
  destroyMusicPlayer,
} from "./host/music-player-host.js";
import {
  startClockWidget,
  destroyClockWidget,
  getClockRoot,
} from "./host/clock-host.js";

Orbit.registerHost("music", {
  start: function () {
    startMusicPlayer();
  },
  getRoot: function () {
    return document.getElementById("music-player");
  },
  destroy: function () {
    destroyMusicPlayer();
  },
  getVisibilityTargets: function () {
    const nodes = [];
    const root = document.getElementById("music-player");
    if (root) nodes.push(root);
    // Only portals marked as ours (Phase 3 ownership); fallback id for single-instance pages
    const marked = document.querySelectorAll(
      '[data-orbit-portal="music-dock-list"]'
    );
    if (marked && marked.length) {
      for (let i = 0; i < marked.length; i++) nodes.push(marked[i]);
    } else {
      const sheet = document.getElementById("mp-dock-list");
      if (sheet) nodes.push(sheet);
    }
    return nodes;
  },
});

Orbit.registerHost("clock", {
  start: function () {
    startClockWidget();
  },
  getRoot: function () {
    return getClockRoot() || document.getElementById("fwf-clock");
  },
  destroy: function () {
    destroyClockWidget();
  },
});

if (typeof window !== "undefined") {
  window.Orbit = Orbit;
  const boot = function () {
    Orbit.mount(
      typeof window.ORBIT === "object" && window.ORBIT ? window.ORBIT : {}
    );
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}

export { Orbit };
