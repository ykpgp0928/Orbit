/**
 * FWF Clock Widget — second official widget (Phase 5)
 *
 * Proves the Shell is not Music-only: same spatial interaction language,
 * different content (time display).
 */

import { registerWidget } from "../../core/WidgetRegistry.js";

/**
 * Format helpers
 */
function pad(n) {
  return n < 10 ? "0" + n : String(n);
}

function formatTime(d, withSeconds) {
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  if (!withSeconds) return h + ":" + m;
  return h + ":" + m + ":" + pad(d.getSeconds());
}

function formatDate(d) {
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return y + "-" + mo + "-" + day + " 周" + week;
}

/**
 * @param {object} ctx
 * @param {HTMLElement} ctx.root — floating root
 * @param {object} [ctx.refs] — { face, panel, dateEl, fullTimeEl }
 * @param {{ intervalMs?: number, showSeconds?: boolean }} [ctx.options]
 */
export function mount(ctx) {
  const root = ctx && ctx.root;
  const refs = (ctx && ctx.refs) || {};
  const options = (ctx && ctx.options) || {};
  const intervalMs = options.intervalMs != null ? options.intervalMs : 1000;
  const showSeconds = !!options.showSeconds;

  let timer = null;

  function tick() {
    const now = new Date();
    const t = formatTime(now, showSeconds);
    if (refs.face) refs.face.textContent = t;
    if (refs.fullTimeEl) refs.fullTimeEl.textContent = formatTime(now, true);
    if (refs.dateEl) refs.dateEl.textContent = formatDate(now);
    if (root) root.setAttribute("data-time", t);
  }

  function start() {
    stop();
    tick();
    timer = setInterval(tick, intervalMs);
  }

  function stop() {
    if (timer != null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function destroy() {
    stop();
  }

  start();

  return {
    id: "clock",
    tick: tick,
    start: start,
    stop: stop,
    destroy: destroy,
  };
}

registerWidget("clock", { mount: mount });

