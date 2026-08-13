/**
 * FWF Core — WidgetRegistry
 *
 * Runtime does not know about Music; widgets register by id.
 */

const registry = Object.create(null);

/**
 * @param {string} id
 * @param {{ mount: Function, unmount?: Function }} widget
 */
export function registerWidget(id, widget) {
  if (!id || !widget || typeof widget.mount !== "function") {
    throw new Error("registerWidget requires id and mount()");
  }
  registry[id] = widget;
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
 * @param {object} ctx — shell refs, storage, emit, etc.
 */
export function mountWidget(id, ctx) {
  const w = getWidget(id);
  if (!w) throw new Error("Unknown widget: " + id);
  return w.mount(ctx);
}
