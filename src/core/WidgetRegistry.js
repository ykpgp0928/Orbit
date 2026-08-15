/**
 * Orbit / FWF Core — WidgetRegistry (Definition Registry)
 *
 * Holds widget *definitions* only (id → definition).
 * Live instances belong to Orbit Instance Registry (v0.3+).
 * Legacy: registerWidget(id, { mount }) still valid.
 */

const registry = Object.create(null);

/**
 * @param {string} id
 * @param {{ mount: Function, label?: string, version?: string, defaults?: object, unmount?: Function }} widget
 */
export function registerWidget(id, widget) {
  if (!id || typeof id !== "string") {
    throw new Error("registerWidget requires a non-empty string id");
  }
  if (!widget || typeof widget.mount !== "function") {
    throw new Error("registerWidget requires mount()");
  }
  registry[id] = {
    id: id,
    label: typeof widget.label === "string" && widget.label ? widget.label : id,
    version: widget.version,
    defaults: widget.defaults,
    mount: widget.mount,
    unmount: widget.unmount,
  };
}

/**
 * @param {string} id
 */
export function getWidget(id) {
  return registry[id] || null;
}

/**
 * @returns {string[]}
 */
export function listWidgets() {
  return Object.keys(registry);
}

/**
 * @param {string} id
 * @param {object} ctx
 */
export function mountWidget(id, ctx) {
  const w = getWidget(id);
  if (!w) throw new Error("Unknown widget: " + id);
  return w.mount(ctx);
}

/**
 * Test / advanced: clear all definitions (not for production page use).
 */
export function _resetRegistryForTests() {
  for (const k of Object.keys(registry)) {
    delete registry[k];
  }
}
