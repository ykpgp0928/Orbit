/**
 * FWF Music Widget — PlaylistSource (Meting-compatible)
 *
 * Owns: fetch + normalize track list.
 * Does NOT: audio element or shell UI.
 */

/**
 * @typedef {Object} Track
 * @property {string} name
 * @property {string} artist
 * @property {string} url
 * @property {string} pic
 * @property {string} [lrc]
 * @property {number} index
 */

/**
 * @param {string} template
 * @param {{ server: string, type: string, id: string }} cfg
 */
export function buildApiUrl(template, cfg) {
  return template
    .replace(":server", cfg.server)
    .replace(":type", cfg.type)
    .replace(":id", cfg.id)
    .replace(":r", String(Math.random()));
}

/**
 * @param {object} item
 * @param {number} i
 * @returns {Track}
 */
export function normalizeTrack(item, i) {
  return {
    name: item.name || item.title || "Unknown",
    artist: item.artist || item.author || "Unknown",
    url: item.url,
    pic: item.pic || item.cover || "",
    lrc: item.lrc || "",
    index: i,
  };
}

/**
 * @param {{ server: string, type: string, id: string, apis: string[] }} cfg
 * @returns {Promise<Track[]>}
 */
export async function fetchPlaylist(cfg) {
  let lastErr = null;
  for (let i = 0; i < cfg.apis.length; i++) {
    const api = cfg.apis[i];
    try {
      const res = await fetch(buildApiUrl(api, cfg), { mode: "cors" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map(normalizeTrack);
      }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("All Meting APIs failed");
}

/**
 * Next index under loop / order rules.
 * @param {{ length: number, currentIndex: number, orderMode: string, loopMode: string, force?: boolean }} p
 */
export function resolveNextIndex(p) {
  if (!p.length) return -1;
  let next =
    p.orderMode === "random"
      ? Math.floor(Math.random() * p.length)
      : p.currentIndex + 1;
  if (next >= p.length) {
    if (p.loopMode === "all" || p.force) next = 0;
    else return -1;
  }
  return next;
}

/**
 * @param {number} index
 * @param {number} length
 */
export function wrapIndex(index, length) {
  if (!length) return 0;
  return ((index % length) + length) % length;
}
