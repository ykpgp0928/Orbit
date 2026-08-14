/**
 * Orbit Runtime — Phase A + B
 * A: multi-widget mount + visibility
 * B: Launcher panel + hotkey (default Alt+O)
 */

import {
  registerWidget,
  getWidget,
  listWidgets,
  mountWidget,
} from "./WidgetRegistry.js";
import { createLauncher } from "./Launcher.js";
import { maybeShowLauncherHint } from "./LauncherHint.js";

/** @type {object | null} */
let mountedConfig = null;
/** @type {boolean} */
let mounted = false;

/** @type {Map<string, { start: Function, getRoot: Function }>} */
const hostAdapters = new Map();

/** @type {Map<string, { id: string, visible: boolean, started: boolean }>} */
const instances = new Map();

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/** @type {ReturnType<typeof createLauncher> | null} */
let launcher = null;

const api = {
  version: "0.2.0-c",
  mount: mount,
  list: list,
  listRegistered: listRegistered,
  listHosts: listHosts,
  registerHost: registerHost,
  setVisible: setVisible,
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

function ensureLauncher() {
  if (!launcher) {
    launcher = createLauncher(api, getLauncherKey);
  }
  return launcher;
}

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
  });
  return api;
}

function getOrCreateInstance(id) {
  let inst = instances.get(id);
  if (!inst) {
    inst = { id: id, visible: false, started: false };
    instances.set(id, inst);
  }
  return inst;
}

function applyDomVisibility(id, visible) {
  const adapter = hostAdapters.get(id);
  if (!adapter) return false;
  const root = adapter.getRoot();
  if (!root) return false;

  if (root.classList) {
    root.classList.remove("orbit-hiding", "orbit-showing");
    if (visible) root.classList.remove("orbit-hidden");
    else root.classList.add("orbit-hidden");
  }

  if (visible) {
    root.style.display = "";
    root.style.visibility = "";
    root.style.opacity = "";
    root.removeAttribute("hidden");
    root.setAttribute("aria-hidden", "false");
  } else {
    root.style.display = "none";
    root.setAttribute("aria-hidden", "true");
  }

  if (id === "music" && typeof document !== "undefined") {
    const sheet = document.getElementById("mp-dock-list");
    if (sheet && sheet.classList) {
      if (visible) {
        sheet.classList.remove("orbit-hidden");
        sheet.style.display = "";
      } else {
        sheet.classList.add("orbit-hidden");
        sheet.style.display = "none";
      }
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
  return api;
}

function defaultWidgets() {
  const ids = [];
  hostAdapters.forEach(function (_a, id) {
    ids.push({ id: id, visible: true });
  });
  return ids;
}

function mount(config) {
  const page = readPageConfig();
  const cfg = Object.assign({}, page, config || {});

  if (!mounted) {
    mountedConfig = cfg;
    mounted = true;
  } else if (config) {
    mountedConfig = Object.assign({}, mountedConfig, config);
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

  ensureLauncher().bind();

  // Phase C: one-time hotkey tip when ≥2 hosts
  try {
    var hintEnabled = mountedConfig.launcherHint !== false;
    maybeShowLauncherHint({
      enabled: hintEnabled,
      getLauncherKey: getLauncherKey,
      getWidgetCount: function () {
        return hostAdapters.size;
      },
    });
  } catch (e) {}

  emit("mount", { config: mountedConfig });
  return api;
}

function list() {
  const out = [];
  instances.forEach(function (inst) {
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

function toggleLauncher() {
  const L = ensureLauncher();
  const open = L.toggle();
  emit("launcherToggle", { open: open });
  return api;
}

function openLauncher() {
  ensureLauncher().setOpen(true);
  emit("launcherToggle", { open: true });
  return api;
}

function closeLauncher() {
  ensureLauncher().setOpen(false);
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
  setVisible,
  toggleLauncher,
  registerHost,
  on,
  off,
  registerWidget,
  getWidget,
  listWidgets,
  mountWidget,
};

export default Orbit;
