/**
 * FWF Core — minimal event bus
 */

export function createEmitter() {
  const map = new Map();

  return {
    on(event, fn) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(fn);
      return () => this.off(event, fn);
    },

    off(event, fn) {
      const set = map.get(event);
      if (set) set.delete(fn);
    },

    emit(event, payload) {
      const set = map.get(event);
      if (!set) return;
      set.forEach((fn) => {
        try {
          fn(payload);
        } catch (err) {
          console.error(`[FWF emit] ${event}`, err);
        }
      });
    },

    once(event, fn) {
      const wrap = (payload) => {
        this.off(event, wrap);
        fn(payload);
      };
      return this.on(event, wrap);
    },
  };
}
