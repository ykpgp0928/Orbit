/**
 * FWF Media — AudioEngine
 *
 * Owns: HTMLAudioElement lifecycle, play/pause/seek, ended/error.
 * Does NOT: playlist order, UI, dock, shell position.
 */

/**
 * @typedef {Object} AudioEngineHandlers
 * @property {() => void} [onPlay]
 * @property {() => void} [onPause]
 * @property {() => void} [onTimeUpdate]
 * @property {() => void} [onEnded]
 * @property {() => void} [onError]
 * @property {() => void} [onLoadedMetadata]
 */

/**
 * @param {AudioEngineHandlers} [handlers]
 */
export function createAudioEngine(handlers) {
  const h = handlers || {};
  /** @type {HTMLAudioElement | null} */
  let el = null;
  let volume = 0.7;

  function ensure() {
    if (el) return el;
    el = new Audio();
    el.preload = "metadata";
    el.volume = volume;
    el.addEventListener("timeupdate", function () {
      if (h.onTimeUpdate) h.onTimeUpdate();
    });
    el.addEventListener("ended", function () {
      if (h.onEnded) h.onEnded();
    });
    el.addEventListener("play", function () {
      if (h.onPlay) h.onPlay();
    });
    el.addEventListener("pause", function () {
      if (h.onPause) h.onPause();
    });
    el.addEventListener("error", function () {
      if (h.onError) h.onError();
    });
    el.addEventListener("loadedmetadata", function () {
      if (h.onLoadedMetadata) h.onLoadedMetadata();
    });
    return el;
  }

  function setSource(url) {
    ensure();
    el.src = url || "";
    el.load();
  }

  function play() {
    ensure();
    const p = el.play();
    if (p && p.catch) p.catch(function () {});
    return p;
  }

  function pause() {
    if (el) el.pause();
  }

  function toggle() {
    ensure();
    if (el.paused) return play();
    pause();
  }

  function seek(ratio) {
    if (!el || !isFinite(el.duration)) return;
    const r = Math.min(1, Math.max(0, ratio));
    el.currentTime = r * el.duration;
  }

  function setCurrentTime(t) {
    if (!el) return;
    el.currentTime = t;
  }

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    if (el) el.volume = volume;
  }

  function getVolume() {
    return volume;
  }

  function getCurrentTime() {
    return el ? el.currentTime || 0 : 0;
  }

  function getDuration() {
    return el && isFinite(el.duration) ? el.duration : 0;
  }

  function isPaused() {
    return !el || el.paused;
  }

  function hasSource() {
    return !!(el && el.src);
  }

  function getElement() {
    return el;
  }

  function destroy() {
    if (!el) return;
    el.pause();
    el.removeAttribute("src");
    el.load();
    el = null;
  }

  return {
    ensure: ensure,
    setSource: setSource,
    play: play,
    pause: pause,
    toggle: toggle,
    seek: seek,
    setCurrentTime: setCurrentTime,
    setVolume: setVolume,
    getVolume: getVolume,
    getCurrentTime: getCurrentTime,
    getDuration: getDuration,
    isPaused: isPaused,
    hasSource: hasSource,
    getElement: getElement,
    destroy: destroy,
  };
}
