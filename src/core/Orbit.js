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
import { createLifecycleScope } from "./LifecycleScope.js";
import { VERSION } from "./version.js";

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

/**
 * Per-widget visibility persistence (local-first, M3 requirement).
 * User toggle state (Launcher switch, notice close) survives reloads and
 * wins over ORBIT.widgets defaults. Destroy clears the preference so a
 * config-driven remount restores the default. Opt out with
 * ORBIT.persistVisibility: false.
 */
const VIS_STORAGE_KEY = "orbit-visible-v1";

function readVisiblePrefs() {
  try {
    const raw = localStorage.getItem(VIS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveVisiblePref(id, visible) {
  try {
    const prefs = readVisiblePrefs();
    prefs[id] = !!visible;
    localStorage.setItem(VIS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {}
}

function persistVisibilityEnabled() {
  const cfg = mountedConfig || readPageConfig();
  return !cfg || cfg.persistVisibility !== false;
}

/** @type {ReturnType<typeof createLauncher> | null} */
let launcher = null;
/** @type {ReturnType<typeof createLauncherFallback> | null} */
let fallback = null;

const api = {
  version: VERSION,
  mount: mount,
  register: register,
  list: list,
  get: get,
  listRegistered: listRegistered,
  listHosts: listHosts,
  getLabel: getLabel,
  registerHost: registerHost,
  setVisible: setVisible,
  destroy: destroy,
  toggleLauncher: toggleLauncher,
  openLauncher: openLauncher,
  closeLauncher: closeLauncher,
  on: on,
  off: off,
  exportProfile: exportProfile,
  importProfile: importProfile,
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
    label: adapter.label,
    defaultVisible: adapter.defaultVisible !== false,
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
 * Widget v1 definition register (Contract Alpha, M2).
 * Registers the definition AND bridges it onto the proven HostAdapter
 * instance path (start / getRoot / destroy / visibility / launcher),
 * so a Contract widget gets the same Runtime management as first-party hosts.
 * @param {object} definition
 */
function register(definition) {
  if (!definition || !definition.id) {
    throw new Error("register requires definition.id");
  }
  registerWidget(definition.id, definition);
  if (!hostAdapters.has(definition.id)) {
    hostAdapters.set(definition.id, createContractAdapter(definition));
  }
  return api;
}

// =========================================================================
// Contract Alpha — Runtime services (M2)
// ctx = { lifecycle, visibility, profile, portal, launcher }
// =========================================================================

function createContractCtx(id, definition) {
  const scope = createLifecycleScope();

  /** @type {HTMLElement[]} */
  let portals = [];

  const services = {
    /** Per-instance cleanup bag; dispose() is idempotent. */
    lifecycle: scope,

    /** Single-element show/hide with aria coordination. */
    visibility: {
      setVisible: function (el, visible) {
        setElementVisible(el, !!visible);
      },
    },

    /** Per-widget-id namespaced local persistence (JSON only). */
    profile: {
      get: function () {
        try {
          const raw = localStorage.getItem("orbit-profile:" + id);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      },
      set: function (obj) {
        try {
          localStorage.setItem("orbit-profile:" + id, JSON.stringify(obj));
        } catch (e) {}
      },
      clear: function () {
        try {
          localStorage.removeItem("orbit-profile:" + id);
        } catch (e) {}
      },
    },

    /** body-level sheet/menu ownership; Runtime hides + removes on destroy. */
    portal: {
      claim: function (el) {
        if (el && portals.indexOf(el) < 0) portals.push(el);
      },
      release: function (el) {
        const i = portals.indexOf(el);
        if (i >= 0) portals.splice(i, 1);
      },
      list: function () {
        return portals.slice();
      },
    },

    /** Launcher access for the widget. */
    launcher: {
      open: openLauncher,
      close: closeLauncher,
      toggle: toggleLauncher,
    },

    /**
     * Runtime-managed instance control (M3 requirement): lets a widget
     * synchronize its OWN runtime state (e.g. a notice close button) with
     * the Launcher switch and the persisted visibility preference.
     */
    instance: {
      setVisible: function (visible) {
        setVisible(definition.id, !!visible);
      },
      destroy: function () {
        destroy(definition.id);
      },
    },
  };

  return { ctx: services, portals: portals };
}

/**
 * Wrap a Contract definition as a HostAdapter.
 * @param {object} definition
 */
function createContractAdapter(definition) {
  let instance = null;
  let ctxCtl = null;

  const adapter = {
    label: definition.label,
    defaultVisible: definition.defaultVisible !== false,
    start: function () {
      if (instance) return true;
      try {
        ctxCtl = createContractCtx(definition.id, definition);
        const mounted = definition.mount(ctxCtl.ctx);
        if (!mounted || typeof mounted.destroy !== "function") {
          throw new Error(
            "Contract widget " + definition.id + " mount() must return a WidgetInstance with destroy()"
          );
        }
        instance = mounted;
        // delegate visibility only when the widget implements setVisible;
        // otherwise applyDomVisibility falls through to generic DOM handling
        if (typeof instance.setVisible === "function") {
          adapter.setVisible = function (visible) {
            instance.setVisible(!!visible);
          };
        } else {
          delete adapter.setVisible;
        }
        return true;
      } catch (e) {
        emit("widgetError", { id: definition.id, phase: "mount", error: e });
        console.error("[Orbit] contract mount failed", definition.id, e);
        instance = null;
        return false;
      }
    },
    getRoot: function () {
      return (instance && instance.root) || null;
    },
    getVisibilityTargets: function () {
      const targets = [];
      if (instance && instance.root) targets.push(instance.root);
      // M3: WidgetInstance.portals() lets hosts (e.g. Music dock sheet)
      // report body-level nodes without touching Runtime internals.
      if (instance && typeof instance.portals === "function") {
        try {
          const extra = instance.portals() || [];
          for (let i = 0; i < extra.length; i++) {
            if (extra[i] && targets.indexOf(extra[i]) < 0) targets.push(extra[i]);
          }
        } catch (e) {}
      }
      if (ctxCtl) {
        for (let i = 0; i < ctxCtl.portals.length; i++) {
          if (ctxCtl.portals[i] && targets.indexOf(ctxCtl.portals[i]) < 0) {
            targets.push(ctxCtl.portals[i]);
          }
        }
      }
      return targets;
    },
    destroy: function () {
      if (instance) {
        try {
          if (typeof instance.destroy === "function") instance.destroy();
        } catch (e) {
          emit("widgetError", { id: definition.id, phase: "destroy", error: e });
          console.error("[Orbit] contract destroy failed", definition.id, e);
        }
        // M2: Runtime owns teardown of the instance boundary
        if (instance.root && instance.root.parentNode) {
          try { instance.root.parentNode.removeChild(instance.root); } catch (e) {}
        }
        instance = null;
      }
      if (ctxCtl) {
        try {
          ctxCtl.ctx.lifecycle.dispose();
        } catch (e) {}
        // remove claimed portals (M2: Runtime owns portal teardown)
        for (let i = 0; i < ctxCtl.portals.length; i++) {
          const el = ctxCtl.portals[i];
          try {
            if (el && el.parentNode) el.parentNode.removeChild(el);
          } catch (e) {}
        }
        ctxCtl.portals.length = 0;
        ctxCtl = null;
      }
    },
  };

  return adapter;
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
 * Single-element visibility primitive (M2): shared by the host-adapter path
 * (applyDomVisibility) and the Contract ctx.visibility service.
 */
function setElementVisible(el, visible) {
  if (!el) return;
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
    setElementVisible(targets[i], visible);
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
    // M4 fix: only mark started when the adapter actually mounted.
    // Contract adapters return false on mount() throw, so a failed mount
    // stays "not started" (Launcher OFF, next setVisible retries).
    const ok = adapter.start() !== false;
    if (ok) {
      inst.started = true;
    } else {
      inst.visible = false;
    }
  }
  return inst.started;
}

function setVisible(id, visible) {
  if (!id) return api;
  visible = !!visible;
  const inst = getOrCreateInstance(id);

  if (visible) {
    const started = ensureStarted(id);
    inst.visible = started;
    if (started) {
      var tries = 0;
      function paint() {
        const ok = applyDomVisibility(id, true);
        if (!ok && tries < 20) {
          tries += 1;
          setTimeout(paint, 50);
        }
      }
      paint();
    }
  } else {
    inst.visible = false;
    if (inst.started) {
      applyDomVisibility(id, false);
    }
  }

  if (persistVisibilityEnabled()) {
    saveVisiblePref(id, visible);
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
 * options.forget: also clear the persisted visibility preference so the
 * next mount falls back to the ORBIT.widgets default.
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

  // M4 fix: options.forget clears the persisted visibility preference
  // (default: keep it — destroy is a program action, not a user preference).
  if (options && options.forget) {
    try {
      const prefs = readVisiblePrefs();
      if (id in prefs) {
        delete prefs[id];
        localStorage.setItem(VIS_STORAGE_KEY, JSON.stringify(prefs));
      }
    } catch (e) {}
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
  hostAdapters.forEach(function (a, id) {
    // M4 fix: adapters may opt out of the default-on list (e.g. Notice) —
    // consistent with the docs ("notice must be listed in ORBIT.widgets").
    ids.push({ id: id, visible: a.defaultVisible !== false });
  });
  return ids;
}

/** @type {MutationObserver | null} */
let bodyRecoveryObserver = null;

/**
 * Runtime-level generic styles. Injected at mount() time — independent of the
 * Launcher panel ever being opened. Without these, setElementVisible()'s
 * orbit-hidden classes would have no visual effect (e.g. Notice close button).
 */
const RUNTIME_STYLE_ID = "orbit-runtime-style";
function ensureRuntimeStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(RUNTIME_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = RUNTIME_STYLE_ID;
  s.textContent =
    "/* Orbit runtime — visibility primitives (setElementVisible) */" +
    ".orbit-hidden{" +
    "opacity:0 !important;visibility:hidden !important;pointer-events:none !important;" +
    "transition:opacity .22s ease, visibility .22s ease !important;" +
    "}" +
    ".orbit-hidden-final{display:none !important;}";
  document.head.appendChild(s);
}

/**
 * M4 — Profile Alpha (local-first, portable).
 *
 * Envelope:
 *   {
 *     "schema": "orbit-profile/0.4",
 *     "exportedAt": "<ISO>",
 *     "runtime": { "launcherKey": "Alt+O", "visibility": { "<id>": bool } },
 *     "widgets": { "<id>": <per-widget profile JSON>, "music": { state: <legacy> } }
 *   }
 *
 * Data stays in the browser; export is always user-initiated.
 */
const PROFILE_SCHEMA = "orbit-profile/0.4";
const PROFILE_PREFIX = "orbit-profile:";
const MUSIC_LEGACY_KEY = "mp-state-v3";

function collectWidgetProfiles() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || key.indexOf(PROFILE_PREFIX) !== 0) continue;
      const id = key.slice(PROFILE_PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        out[id] = raw ? JSON.parse(raw) : null;
      } catch (e) {
        out[id] = null; // corrupted single entry — export as null, never block
      }
    }
  } catch (e) {}
  return out;
}

function exportProfile() {
  const profile = {
    schema: PROFILE_SCHEMA,
    exportedAt: new Date().toISOString(),
    runtime: {
      launcherKey: getLauncherKey(),
      visibility: readVisiblePrefs(),
    },
    widgets: collectWidgetProfiles(),
  };
  // Music's legacy host state travels as widgets.music.state
  try {
    const raw = localStorage.getItem(MUSIC_LEGACY_KEY);
    if (raw) {
      try {
        profile.widgets.music = Object.assign(
          {},
          profile.widgets.music || {},
          { state: JSON.parse(raw) }
        );
      } catch (e) {}
    }
  } catch (e) {}
  return profile;
}

/**
 * Import a previously exported profile. Validation is strict on the
 * envelope (schema), tolerant inside it: a corrupted widget entry is
 * skipped without blocking the rest; unknown widget ids keep their data
 * (they become usable if the widget is registered later).
 * @param {object|string} input
 * @returns {{ ok: boolean, error?: string, imported?: { widgets: string[], visibility: string[] } }}
 */
function importProfile(input) {
  let profile = input;
  if (typeof profile === "string") {
    try {
      profile = JSON.parse(profile);
    } catch (e) {
      return { ok: false, error: "invalid-json" };
    }
  }
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { ok: false, error: "not-an-object" };
  }
  if (profile.schema !== PROFILE_SCHEMA) {
    return {
      ok: false,
      error: "unsupported-schema: " + String(profile.schema),
    };
  }

  const imported = { widgets: [], visibility: [] };

  // runtime.visibility → merge into persisted preferences (never wipe
  // prefs for ids the imported profile does not mention)
  if (
    profile.runtime &&
    typeof profile.runtime.visibility === "object" &&
    profile.runtime.visibility !== null
  ) {
    const prefs = readVisiblePrefs();
    for (const id of Object.keys(profile.runtime.visibility)) {
      const v = profile.runtime.visibility[id];
      if (typeof v === "boolean") {
        prefs[id] = v;
        imported.visibility.push(id);
      }
    }
    try {
      localStorage.setItem(VIS_STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  // widgets → per-widget namespaced storage; corrupted entries skipped
  if (
    profile.widgets &&
    typeof profile.widgets === "object" &&
    profile.widgets !== null
  ) {
    for (const id of Object.keys(profile.widgets)) {
      const w = profile.widgets[id];
      if (!w || typeof w !== "object" || Array.isArray(w)) {
        continue; // single-entry corruption tolerance
      }
      if (id === "music" && w.state && typeof w.state === "object") {
        // legacy host state back to its own key; the rest to profile ns
        try {
          localStorage.setItem(MUSIC_LEGACY_KEY, JSON.stringify(w.state));
        } catch (e) {}
        const rest = Object.assign({}, w);
        delete rest.state;
        if (Object.keys(rest).length) {
          try {
            localStorage.setItem(PROFILE_PREFIX + id, JSON.stringify(rest));
          } catch (e) {}
        }
      } else {
        try {
          localStorage.setItem(PROFILE_PREFIX + id, JSON.stringify(w));
        } catch (e) {}
      }
      imported.widgets.push(id);
    }
  }

  emit("profileImport", { imported: imported });
  return { ok: true, imported: imported };
}

/**
 * M3 fix — unified instance recovery for PJAX / theme body swaps.
 *
 * Some static-site themes (Hexo + PJAX etc.) replace document.body children
 * during navigation. Widget roots that live in body then disappear. Music
 * had its own pjax/observer revival; Clock and Notice (Contract widgets)
 * had none. This Runtime-level observer re-attaches ANY started, non-destroyed
 * instance root that vanished from body — no per-widget recovery code needed.
 *
 * Guards:
 *  - inst.started && !inst.destroyed  → destroy() never revives
 *  - hidden instances keep their hide state (classList travels with root)
 */
function ensureBodyRecovery() {
  if (bodyRecoveryObserver || typeof document === "undefined") return;
  bodyRecoveryObserver = new MutationObserver(function () {
    if (!document.body) return;
    hostAdapters.forEach(function (adapter, id) {
      const inst = instances.get(id);
      if (!inst || !inst.started || inst.destroyed) return;
      if (!adapter || typeof adapter.getRoot !== "function") return;
      let root = null;
      try {
        root = adapter.getRoot();
      } catch (e) {}
      if (!root) return;
      if (document.body.contains(root)) return;
      try {
        document.body.appendChild(root);
      } catch (e) {}
      if (typeof adapter.onRootRestored === "function") {
        try {
          adapter.onRootRestored();
        } catch (e) {}
      }
      // M4 fix: also re-attach claimed portals / visibility targets that
      // left the body in the same swap (e.g. Music's dock sheet).
      if (typeof adapter.getVisibilityTargets === "function") {
        try {
          const targets = adapter.getVisibilityTargets() || [];
          for (let i = 0; i < targets.length; i++) {
            const el = targets[i];
            if (el && el !== root && !document.body.contains(el)) {
              document.body.appendChild(el);
            }
          }
        } catch (e) {}
      }
    });
  });
  // Watch <html> (subtree) instead of <body>: some PJAX themes replace the
  // <body> element itself, which would silently kill a body-bound observer.
  bodyRecoveryObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
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

  // User visibility prefs (Launcher toggles / notice close) win over the
  // config defaults; missing prefs fall back to the configured value.
  const prefs = persistVisibilityEnabled() ? readVisiblePrefs() : {};
  widgets.forEach(function (w) {
    if (!w || !w.id) return;
    if (!hostAdapters.has(w.id)) return;
    const pref = prefs[w.id];
    const vis = typeof pref === "boolean" ? pref : w.visible !== false;
    setVisible(w.id, vis);
  });

  if (!launcherBound) {
    ensureLauncher().bind();
    launcherBound = true;
  }

  ensureRuntimeStyles();
  ensureBodyRecovery();

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

/**
 * M2: user-facing label for a host/widget — Contract metadata first,
 * then adapter label, then the raw id.
 * @param {string} id
 */
function getLabel(id) {
  const def = getWidget(id);
  if (def && def.label) return def.label;
  const adapter = hostAdapters.get(id);
  if (adapter && adapter.label) return adapter.label;
  return id;
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
  getLabel,
  exportProfile,
  importProfile,
  on,
  off,
  registerWidget,
  getWidget,
  listWidgets,
  mountWidget,
};

export default Orbit;
