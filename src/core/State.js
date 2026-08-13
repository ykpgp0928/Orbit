/**
 * FWF Core — Lightweight State + normalize
 *
 * Phase 1 goals:
 * - Single source of truth for Shell mode / dock / layout / interaction flags
 * - All illegal combinations corrected inside normalize()
 * - No business/media state here (playing track belongs to Widget later)
 *
 * Usage:
 *   const state = createState(initial);
 *   state.patch({ mode: "DOCK", dock: { side: "left" } });
 *   state.subscribe((next, prev, patch) => { ... });
 *   state.get(); // readonly snapshot
 */

/** @typedef {"BALL" | "PANEL" | "DOCK"} Mode */

/**
 * @typedef {Object} DockState
 * @property {boolean} enabled
 * @property {"left" | "right" | null} side
 * @property {boolean} expanded
 * @property {boolean} closing
 */

/**
 * @typedef {Object} LayoutState
 * @property {boolean} expandLeft
 * @property {boolean} listOpen
 * @property {boolean} listClosing
 * @property {boolean} listUp
 * @property {boolean} dockDown
 */

/**
 * @typedef {Object} InteractionState
 * @property {boolean} dragging
 * @property {boolean} snapping
 * @property {boolean} magnet
 * @property {"left" | "right" | null} magnetSide
 * @property {boolean} noHoverExpand
 */

/**
 * @typedef {Object} ShellState
 * @property {Mode} mode
 * @property {{ x: number, y: number }} position
 * @property {DockState} dock
 * @property {LayoutState} layout
 * @property {InteractionState} interaction
 * @property {boolean} playing
 * @property {boolean} isMobile
 * @property {string | null} widgetId
 */

/**
 * Create initial shell state.
 * @param {Partial<ShellState>} [overrides]
 * @returns {ShellState}
 */
export function createInitialState(overrides = {}) {
  const base = {
    mode: "BALL",
    position: { x: 0, y: 0 },
    dock: {
      enabled: false,
      side: null,
      expanded: false,
      closing: false,
    },
    layout: {
      expandLeft: false,
      listOpen: false,
      listClosing: false,
      listUp: false,
      dockDown: false,
    },
    interaction: {
      dragging: false,
      snapping: false,
      magnet: false,
      magnetSide: null,
      noHoverExpand: false,
    },
    playing: false,
    isMobile: typeof window !== "undefined" ? window.innerWidth <= 600 : false,
    widgetId: null,
  };
  return normalize(deepMerge(base, overrides));
}

/**
 * Normalize — single place that kills illegal combinations.
 * Aligns with existing player behavior (baseline).
 * @param {ShellState} raw
 * @returns {ShellState}
 */
export function normalize(raw) {
  const s = structuredClone
    ? structuredClone(raw)
    : JSON.parse(JSON.stringify(raw));

  // --- Mode is one of three ---
  if (s.mode !== "BALL" && s.mode !== "PANEL" && s.mode !== "DOCK") {
    s.mode = "BALL";
  }

  // --- dragging forces exit PANEL & close list (baseline: collapseToBall) ---
  if (s.interaction.dragging) {
    if (s.mode === "PANEL") {
      s.mode = "BALL";
    }
    s.layout.listOpen = false;
    s.layout.listClosing = false;
    // while dragging we are not in dock expanded UI
    s.dock.expanded = false;
    s.dock.closing = false;
  }

  // --- snapping only meaningful right after drag ---
  if (s.interaction.dragging && s.interaction.snapping) {
    s.interaction.snapping = false;
  }

  // --- DOCK invariants ---
  if (s.mode === "DOCK") {
    s.dock.enabled = true;
    // expandLeft only for free PANEL
    s.layout.expandLeft = false;
    // cannot be list-open on the free panel while docked
    // (dock uses its own sheet)
    if (s.layout.listOpen) {
      s.layout.listOpen = false;
      s.layout.listClosing = false;
    }
  } else {
    // not in DOCK mode → clear dock UI flags
    s.dock.enabled = false;
    s.dock.expanded = false;
    s.dock.closing = false;
    // keep side only as memory if needed; clear for strictness
    // (baseline remembers lastDockSide while near edge — we keep side value)
  }

  // --- dock.expanded / closing only valid when mode === DOCK ---
  if (s.mode !== "DOCK") {
    s.dock.expanded = false;
    s.dock.closing = false;
  }
  if (s.dock.closing) {
    // closing animation: force expanded visual off
    s.dock.expanded = false;
  }

  // --- PANEL-only layout flags ---
  if (s.mode !== "PANEL") {
    s.layout.expandLeft = false;
    // list can only be open in PANEL (non-dock)
    if (s.mode === "BALL") {
      s.layout.listOpen = false;
      // allow listClosing to finish animation if needed; clear after
    }
  }

  // --- magnet only while dragging ---
  if (!s.interaction.dragging) {
    s.interaction.magnet = false;
    s.interaction.magnetSide = null;
  }

  // --- mobile flag consistency (caller should update on resize) ---
  if (typeof s.isMobile !== "boolean") {
    s.isMobile = false;
  }

  return s;
}

/**
 * @param {Partial<ShellState>} [initial]
 */
export function createState(initial) {
  let current = createInitialState(initial);
  const listeners = new Set();

  return {
    /** @returns {Readonly<ShellState>} */
    get() {
      return current;
    },

    /**
     * Patch and normalize. Returns the next state.
     * @param {Partial<ShellState>} partial
     * @returns {ShellState}
     */
    patch(partial) {
      const prev = current;
      const merged = deepMerge(current, partial);
      const next = normalize(merged);
      current = next;
      listeners.forEach((fn) => {
        try {
          fn(next, prev, partial);
        } catch (err) {
          console.error("[FWF State] subscriber error", err);
        }
      });
      return next;
    },

    /**
     * Replace entire state (still normalized).
     * @param {ShellState} nextRaw
     */
    set(nextRaw) {
      return this.patch(nextRaw);
    },

    /**
     * @param {(next: ShellState, prev: ShellState, patch: Partial<ShellState>) => void} fn
     * @returns {() => void} unsubscribe
     */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// --- helpers ---

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(target, source) {
  const out = { ...target };
  if (!source) return out;
  Object.keys(source).forEach((key) => {
    const sv = source[key];
    const tv = target[key];
    if (isObject(sv) && isObject(tv)) {
      out[key] = deepMerge(tv, sv);
    } else if (sv !== undefined) {
      out[key] = sv;
    }
  });
  return out;
}
