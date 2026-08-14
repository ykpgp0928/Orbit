/**
 * Orbit Runtime entry — Phase A
 * Registers Music + Clock hosts, exposes window.Orbit, mounts from window.ORBIT.
 *
 * Single-widget pages should keep using entry-music / entry-clock.
 * Multi-widget / Demo should use this bundle only (avoid double-start).
 */
import { Orbit } from "./core/Orbit.js";
import { startMusicPlayer } from "./host/music-player-host.js";
import { startClockWidget } from "./host/clock-host.js";

Orbit.registerHost("music", {
  start: function () {
    startMusicPlayer();
  },
  getRoot: function () {
    return document.getElementById("music-player");
  },
});

Orbit.registerHost("clock", {
  start: function () {
    startClockWidget();
  },
  getRoot: function () {
    return document.getElementById("fwf-clock");
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
