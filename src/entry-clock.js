/**
 * Clock widget entry — bundle to dist/floating-widget-clock.js
 */
import {
  startClockWidget,
  destroyClockWidget,
  getClockRoot,
  getClockInstance,
} from "./host/clock-host.js";

startClockWidget();

if (typeof window !== "undefined") {
  window.__FWF_CLOCK__ = {
    start: startClockWidget,
    destroy: destroyClockWidget,
    getRoot: getClockRoot,
    getInstance: getClockInstance,
  };
}
