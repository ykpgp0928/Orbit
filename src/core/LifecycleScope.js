/**
 * Orbit v0.3 — LifecycleScope
 *
 * Per-instance cleanup bag. Register external side effects with add(fn);
 * dispose() runs them in reverse order, idempotently.
 * One failing cleanup must not block the rest.
 */

/**
 * @returns {{
 *   add: (fn: () => void | Promise<void>) => () => void,
 *   dispose: (emitError?: (err: unknown) => void) => Promise<void>,
 *   disposed: boolean
 * }}
 */
export function createLifecycleScope() {
  let disposed = false;
  /** @type {Set<() => void | Promise<void>>} */
  const cleanups = new Set();

  /**
   * @param {() => void | Promise<void>} fn
   * @returns {() => void} unregister (no-op if already disposed)
   */
  function add(fn) {
    if (typeof fn !== "function") {
      throw new Error("LifecycleScope.add requires a function");
    }
    if (disposed) {
      Promise.resolve()
        .then(fn)
        .catch(function () {});
      return function () {};
    }
    cleanups.add(fn);
    return function remove() {
      cleanups.delete(fn);
    };
  }

  /**
   * @param {(err: unknown) => void} [emitError]
   */
  async function dispose(emitError) {
    if (disposed) return;
    disposed = true;
    const list = Array.from(cleanups).reverse();
    cleanups.clear();
    for (let i = 0; i < list.length; i++) {
      try {
        await list[i]();
      } catch (error) {
        if (typeof emitError === "function") {
          try {
            emitError(error);
          } catch (_) {}
        }
      }
    }
  }

  return {
    add: add,
    dispose: dispose,
    get disposed() {
      return disposed;
    },
  };
}
