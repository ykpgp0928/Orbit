/**
 * Orbit Runtime — Phase 4 API surface
 *
 * Public: mount, register, list, get, setVisible, destroy,
 *         open/close/toggleLauncher, on/off, registerHost (legacy)
 *
 * Semantics:
 * - setVisible(false) = hide (keep instance/resources)
 * - destroy(id) = explicit teardown
 * - ORBIT.widgets omitting an already-mounted id does NOT destroy it
 */

import {
  registerWidget,
  getWidget,
  listWidgets,
  mountWidget,
} from "./WidgetRegistry.js";
import { createLauncher } from "./Launcher.js";
import { maybeShowLauncherHint } from "./LauncherHint.js";
import { createLauncherFallback } from "./LauncherFallback.js";

/** @type {object | null} */
let mountedConfig = null;
/** @type {boolean} */
let mounted = false;
/** @type {boolean} */
let launcherBound = false;

/**
 * Legacy + v0.3 host adapter
 * @typedef {Object} HostAdapter
 * @property {() => void} start
 * @property {() => HTMLElement | null} getRoot
 * @property {() => void} [destroy]
 * @property {() => HTMLElement[]} [getVisibilityTargets]
 * @property {(visible: boolean) => void} [setVisible]
 */

/** @type {Map<string, HostAdapter>} */
const hostAdapters = new Map();

/**
 * @typedef {Object} InstanceRecord
 * @property {string} id
 * @property {boolean} visible
 * @property {boolean} started
 * @property {boolean} destroyed
 */

/** @type {Map<string, InstanceRecord>} */
const instances = new Map();

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/** @type {ReturnType<typeof createLauncher> | null} */
let launcher = null;
/** @type {ReturnType<typeof createLauncherFallback> | null} */
let fallback = null;

const api = {
  version: "0.3.0-phase5",
  mount: mount,
  register: register,
  list: list,
  get: get,
  listRegistered: listRegistered,
  listHosts: listHosts,
  registerHost: registerHost,
  setVisible: setVisible,
  destroy: destroy,
  toggleLauncher: toggleLauncher,
  openLauncher: openLauncher,
  closeLauncher: closeLauncher,
  on: on,
  off: off,
  registry: null,
  isMounted: function () {
    return mounted;
  },
  getConfig: function () {
    return mountedConfig ? Object.assign({}, mountedConfig) : null;
  },
  getLauncherKey: getLauncherKey,
};

const Orbit = api;

function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  set.forEach(function (fn) {
    try {
      fn(payload);
    } catch (e) {
      console.error("[Orbit] listener error", event, e);
    }
  });
}

function readPageConfig() {
  if (typeof window === "undefined") return {};
  const o = window.ORBIT;
  return o && typeof o === "object" ? o : {};
}

function getLauncherKey() {
  const cfg = mountedConfig || readPageConfig();
  return (cfg && cfg.launcherKey) || "Alt+O";
}

function getLauncherFallbackMode() {
  const cfg = mountedConfig || readPageConfig();
  const m = cfg && cfg.launcherFallback;
  if (m === "none" || m === "host-button" || m === "ghost") return m;
  return "ghost";
}

function ensureLauncher() {
  if (!launcher) {
    launcher = createLauncher(api, getLauncherKey);
  }
  return launcher;
}

function ensureFallback() {
  if (!fallback) {
    fallback = createLauncherFallback(api, getLauncherFallbackMode);
  }
  return fallback;
}

function syncFallback() {
  try {
    ensureFallback().sync();
  } catch (e) {}
}

/**
 * Legacy adapter registration (v0.2 compatible).
 * @param {string} id
 * @param {HostAdapter} adapter
 */
function registerHost(id, adapter) {
  if (!id || !adapter || typeof adapter.start !== "function") {
    throw new Error("registerHost requires id and start()");
  }
  hostAdapters.set(id, {
    start: adapter.start,
    getRoot:
      typeof adapter.getRoot === "function"
        ? adapter.getRoot
        : function () {
            return null;
          },
    destroy: typeof adapter.destroy === "function" ? adapter.destroy : null,
    getVisibilityTargets:
      typeof adapter.getVisibilityTargets === "function"
        ? adapter.getVisibilityTargets
        : null,
    setVisible:
      typeof adapter.setVisible === "function" ? adapter.setVisible : null,
  });
  return api;
}

/**
 * Widget v1 definition register (alias of registry).
 * @param {object} definition
 */
function register(definition) {
  if (!definition || !definition.id) {
    throw new Error("register requires definition.id");
  }
  registerWidget(definition.id, definition);
  return api;
}

function getOrCreateInstance(id) {
  let inst = instances.get(id);
  if (!inst) {
    inst = { id: id, visible: false, started: false, destroyed: false };
    instances.set(id, inst);
  }
  return inst;
}

/**
 * Apply hide/show to root + optional visibility targets from adapter.
 * No per-widget id hardcoding in Runtime.
 */
function applyDomVisibility(id, visible) {
  const adapter = hostAdapters.get(id);
  if (!adapter) return false;

  if (typeof adapter.setVisible === "function") {
    try {
      adapter.setVisible(visible);
      return true;
    } catch (e) {
      console.error("[Orbit] adapter.setVisible", id, e);
    }
  }

  /** @type {HTMLElement[]} */
  const targets = [];
  const root = adapter.getRoot && adapter.getRoot();
  if (root) targets.push(root);
  if (typeof adapter.getVisibilityTargets === "function") {
    try {
      const extra = adapter.getVisibilityTargets() || [];
      for (let i = 0; i < extra.length; i++) {
        if (extra[i] && targets.indexOf(extra[i]) < 0) targets.push(extra[i]);
      }
    } catch (e) {}
  }
  if (!targets.length) return false;

  for (let i = 0; i < targets.length; i++) {
    const el = targets[i];
    if (!el) continue;
    if (visible) {
      if (el._orbitHideTimer) {
        clearTimeout(el._orbitHideTimer);
        el._orbitHideTimer = null;
      }
      if (el.classList) {
        el.classList.remove("orbit-hidden", "orbit-hidden-final", "orbit-hiding");
      }
      el.style.display = "";
      el.style.visibility = "";
      el.style.opacity = "";
      el.removeAttribute("hidden");
      el.setAttribute("aria-hidden", "false");
      // force reflow then allow transition from hidden state if needed
      void el.offsetWidth;
    } else {
      el.setAttribute("aria-hidden", "true");
      if (el.classList) {
        el.classList.remove("orbit-hidden-final");
        el.classList.add("orbit-hidden");
      }
      if (el._orbitHideTimer) clearTimeout(el._orbitHideTimer);
      el._orbitHideTimer = setTimeout(function () {
        el._orbitHideTimer = null;
        if (el.classList && el.classList.contains("orbit-hidden")) {
          el.classList.add("orbit-hidden-final");
        }
      }, 240);
    }
  }
  return true;
}

function ensureStarted(id) {
  const adapter = hostAdapters.get(id);
  if (!adapter) {
    console.warn("[Orbit] no host registered for", id);
    return false;
  }
  const inst = getOrCreateInstance(id);
  if (inst.destroyed) {
    inst.destroyed = false;
    inst.started = false;
  }
  if (!inst.started) {
    adapter.start();
    inst.started = true;
  }
  return true;
}

function setVisible(id, visible) {
  if (!id) return api;
  visible = !!visible;
  const inst = getOrCreateInstance(id);

  if (visible) {
    ensureStarted(id);
    inst.visible = true;
    var tries = 0;
    function paint() {
      const ok = applyDomVisibility(id, true);
      if (!ok && tries < 20) {
        tries += 1;
        setTimeout(paint, 50);
      }
    }
    paint();
  } else {
    inst.visible = false;
    if (inst.started) {
      applyDomVisibility(id, false);
    }
  }

  emit("visibilityChange", { id: id, visible: visible });
  if (launcher && launcher.isOpen()) {
    launcher.renderList();
  }
  syncFallback();
  return api;
}

/**
 * Explicit destroy. Not implied by omitting id from widgets config.
 * @param {string} id
 * @param {{ forget?: boolean }} [options]
 */
function destroy(id, options) {
  if (!id) return api;
  const adapter = hostAdapters.get(id);
  const inst = instances.get(id);

  if (adapter && typeof adapter.destroy === "function") {
    try {
      adapter.destroy();
    } catch (e) {
      emit("widgetError", { id: id, phase: "destroy", error: e });
      console.error("[Orbit] destroy failed", id, e);
    }
  } else if (adapter && adapter.getRoot) {
    const root = adapter.getRoot();
    if (root && root.parentNode) {
      try {
        root.parentNode.removeChild(root);
      } catch (e) {}
    }
  }

  if (inst) {
    inst.started = false;
    inst.visible = false;
    inst.destroyed = true;
  }

  emit("destroy", { id: id, options: options || {} });
  if (launcher && launcher.isOpen()) {
    launcher.renderList();
  }
  syncFallback();
  return api;
}

function get(id) {
  if (!id) return null;
  const inst = instances.get(id);
  if (!inst) return null;
  return {
    id: inst.id,
    visible: !!inst.visible,
    started: !!inst.started,
    destroyed: !!inst.destroyed,
  };
}

function defaultWidgets() {
  const ids = [];
  hostAdapters.forEach(function (_a, id) {
    ids.push({ id: id, visible: true });
  });
  return ids;
}

/**
 * Idempotent mount. widgets[] only updates listed ids — never destroys omitted ones.
 * @param {object} [config]
 */
function mount(config) {
  const page = readPageConfig();
  const cfg = Object.assign({}, page, config || {});

  if (!mounted) {
    mountedConfig = cfg;
    mounted = true;
  } else if (config) {
    // Merge config object but do not interpret missing widgets as teardown
    mountedConfig = Object.assign({}, mountedConfig, config);
    if (config.widgets) {
      mountedConfig.widgets = config.widgets;
    }
  }

  const widgets =
    (mountedConfig &&
      Array.isArray(mountedConfig.widgets) &&
      mountedConfig.widgets.length &&
      mountedConfig.widgets) ||
    defaultWidgets();

  widgets.forEach(function (w) {
    if (!w || !w.id) return;
    if (!hostAdapters.has(w.id)) return;
    const vis = w.visible !== false;
    setVisible(w.id, vis);
  });

  if (!launcherBound) {
    ensureLauncher().bind();
    launcherBound = true;
  }

  try {
    var hintEnabled = !mountedConfig || mountedConfig.launcherHint !== false;
    maybeShowLauncherHint({
      enabled: hintEnabled,
      getLauncherKey: getLauncherKey,
      getWidgetCount: function () {
        return hostAdapters.size;
      },
    });
  } catch (e) {}

  syncFallback();
  emit("mount", { config: mountedConfig });
  return api;
}

function list() {
  const out = [];
  instances.forEach(function (inst) {
    if (inst.destroyed && !inst.started) return;
    out.push({ id: inst.id, visible: !!inst.visible });
  });
  return out;
}

function listRegistered() {
  return listWidgets();
}

function listHosts() {
  return Array.from(hostAdapters.keys());
}

function toggleLauncher(trigger) {
  const L = ensureLauncher();
  const open = L.toggle(trigger);
  emit("launcherOpen", { open: open });
  emit("launcherToggle", { open: open });
  return api;
}

function openLauncher(trigger) {
  ensureLauncher().setOpen(true, trigger);
  emit("launcherOpen", { open: true });
  emit("launcherToggle", { open: true });
  return api;
}

function closeLauncher() {
  ensureLauncher().setOpen(false);
  emit("launcherClose", { open: false });
  emit("launcherToggle", { open: false });
  return api;
}

function on(event, fn) {
  if (!event || typeof fn !== "function") return api;
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return api;
}

function off(event, fn) {
  const set = listeners.get(event);
  if (set && fn) set.delete(fn);
  return api;
}

api.registry = {
  register: registerWidget,
  get: getWidget,
  list: listWidgets,
  mountWidget: mountWidget,
};

export {
  Orbit,
  mount,
  list,
  get,
  setVisible,
  destroy,
  toggleLauncher,
  registerHost,
  register,
  on,
  off,
  registerWidget,
  getWidget,
  listWidgets,
  mountWidget,
};

export default Orbit;
