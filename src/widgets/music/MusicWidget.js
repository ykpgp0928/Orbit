/**
 * FWF Music Widget
 *
 * First official widget. Mounts into Shell slots; uses AudioEngine + PlaylistSource.
 * Shell/Runtime must not import track-specific logic beyond this module.
 */

import { createAudioEngine } from "../../media/AudioEngine.js";
import {
  fetchPlaylist,
  resolveNextIndex,
  wrapIndex,
} from "./PlaylistSource.js";
import { registerWidget } from "../../core/WidgetRegistry.js";

/**
 * @param {object} options
 * @param {object} options.config — server/type/id/apis
 * @param {object} options.ui — { setTitle, setArtist, setCover, setProgress, setPlaying, renderList, onPersist }
 * @param {{ volume?: number, loopMode?: string, orderMode?: string, index?: number, time?: number }} [options.initial]
 */
export function createMusicController(options) {
  const config = options.config;
  const ui = options.ui || {};
  let playlist = [];
  let currentIndex = options.initial && options.initial.index != null ? options.initial.index : 0;
  let loopMode = (options.initial && options.initial.loopMode) || "all";
  let orderMode = (options.initial && options.initial.orderMode) || "list";
  let volume =
    options.initial && options.initial.volume != null
      ? options.initial.volume
      : 0.7;

  const engine = createAudioEngine({
    onPlay: function () {
      if (ui.setPlaying) ui.setPlaying(true);
      if (ui.onPersist) ui.onPersist();
    },
    onPause: function () {
      if (ui.setPlaying) ui.setPlaying(false);
      if (ui.onPersist) ui.onPersist();
    },
    onTimeUpdate: function () {
      if (ui.setProgress) {
        ui.setProgress(engine.getCurrentTime(), engine.getDuration());
      }
    },
    onEnded: function () {
      if (loopMode === "one") {
        engine.setCurrentTime(0);
        engine.play();
      } else {
        playNext(false);
      }
    },
    onError: function () {
      setTimeout(function () {
        playNext(true);
      }, 800);
    },
  });

  engine.setVolume(volume);

  function currentTrack() {
    return playlist[currentIndex] || null;
  }

  function loadSong(index, autoPlay) {
    if (!playlist.length) return;
    currentIndex = wrapIndex(index, playlist.length);
    const track = playlist[currentIndex];
    engine.setSource(track.url);
    if (ui.setTitle) ui.setTitle(track.name);
    if (ui.setArtist) ui.setArtist(track.artist);
    if (ui.setCover) ui.setCover(track.pic);
    if (ui.renderList) ui.renderList(playlist, currentIndex);
    if (ui.onPersist) ui.onPersist();
    if (autoPlay) engine.play();
  }

  function togglePlay() {
    if (!engine.hasSource() && playlist.length) {
      loadSong(currentIndex, true);
      return;
    }
    engine.toggle();
  }

  function playNext(force) {
    const next = resolveNextIndex({
      length: playlist.length,
      currentIndex: currentIndex,
      orderMode: orderMode,
      loopMode: loopMode,
      force: force,
    });
    if (next < 0) return;
    loadSong(next, true);
  }

  function playPrev() {
    if (!playlist.length) return;
    loadSong(currentIndex - 1, true);
  }

  function seek(ratio) {
    engine.seek(ratio);
    if (ui.setProgress) {
      ui.setProgress(engine.getCurrentTime(), engine.getDuration());
    }
  }

  function cycleLoopMode() {
    const modes = ["all", "one", "none"];
    loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    if (ui.onPersist) ui.onPersist();
    return loopMode;
  }

  async function loadPlaylist() {
    playlist = await fetchPlaylist(config);
    if (ui.renderList) ui.renderList(playlist, currentIndex);
    if (currentIndex >= playlist.length) currentIndex = 0;
    loadSong(currentIndex, false);
    const t = options.initial && options.initial.time;
    if (t != null && t > 0) {
      const el = engine.getElement();
      if (el) {
        const seekTo = function () {
          if (el.readyState >= 1) {
            engine.setCurrentTime(t);
            if (ui.setProgress) {
              ui.setProgress(engine.getCurrentTime(), engine.getDuration());
            }
            el.removeEventListener("loadedmetadata", seekTo);
          }
        };
        el.addEventListener("loadedmetadata", seekTo);
      }
    }
    return playlist;
  }

  function getState() {
    return {
      playlist: playlist,
      currentIndex: currentIndex,
      loopMode: loopMode,
      orderMode: orderMode,
      volume: engine.getVolume(),
      time: engine.getCurrentTime(),
      isPlaying: !engine.isPaused(),
    };
  }

  return {
    engine: engine,
    loadPlaylist: loadPlaylist,
    loadSong: loadSong,
    togglePlay: togglePlay,
    playNext: playNext,
    playPrev: playPrev,
    seek: seek,
    cycleLoopMode: cycleLoopMode,
    getState: getState,
    getLoopMode: function () {
      return loopMode;
    },
    getPlaylist: function () {
      return playlist;
    },
    getCurrentIndex: function () {
      return currentIndex;
    },
  };
}

/**
 * Widget entry: mount(ctx) → controller
 * ctx: { config, ui, initial }
 */
export function mount(ctx) {
  return createMusicController(ctx || {});
}

registerWidget("music", { mount: mount });

export default { id: "music", mount: mount };
