/**
 * FWF Music Player Host（模块源码，请用 npm run build 打包后再给 Hexo 使用）
 */
import { createGesture } from "../interaction/Gesture.js";
import { createDrag } from "../interaction/Drag.js";
import { createSnap } from "../interaction/Snap.js";
import { createDock } from "../interaction/Dock.js";
import { createLayout } from "../interaction/Layout.js";
import { createAudioEngine } from "../media/AudioEngine.js";

const _userCfg = (typeof window !== "undefined" && window.FWF_MUSIC) ? window.FWF_MUSIC : {};
const CONFIG = {
    server: _userCfg.server || "netease",
    type: _userCfg.type || "playlist",
    id: _userCfg.id || "3778678",
    apis: [
      "https://api.injahow.cn/meting/?server=:server&type=:type&id=:id",
      "https://meting.mikus.ink/api?server=:server&type=:type&id=:id",
      "https://api.i-meto.com/meting/api?server=:server&type=:type&id=:id&r=:r"
    ],
    storageKey: "mp-state-v3",
    snapThreshold: 40,
    snapRelease: 36,
    snapThresholdMobile: 28,
    snapReleaseMobile: 28,
    longPressMs: 550,
    clickThreshold: 12,
    ballSize: 66,
    ballSizeMobile: 52
  };

  let magnetSide = null;

  let audio = null;
  let playlist = [];
  let currentIndex = 0;
  let isPlaying = false;
  let volume = 0.7;
  let loopMode = "all";
  let orderMode = "list";
  let isOpen = false;
  let isListOpen = false;
  let isDockListOpen = false;
  let isMobile = false;
  let ignoreBallToggleUntil = 0; // 关闭 Dock 后短时间内禁止再次 toggle
  let dockAnchorX = null; // 吸附时锁定的坐标，防止被大卡片 clamp 改写
  let dockAnchorY = null;
  let lastDockSide = null;
  let ballGestureId = null;      // 当前 pointer 手势 id，每手势只 toggle 一次
  let ballToggleBusy = false;    // setOpen 重入锁
  let lastToggleAt = 0; // 防止移动端同一次点击关闭后又立刻打开
  let posX = 0;
  let posY = 0;

  let dragging = false;
  let wasDragging = false;
  let longPressTriggered = false;
  let startClientX = 0;
  let startClientY = 0;
  let originX = 0;
  let originY = 0;
  let moveDist = 0;
  let longPressTimer = null;
  let activePointer = null;
  let pointerId = null;

  let root = null;
  let coverEl = null;
  let titleEl = null;
  let artistEl = null;
  let playedEl = null;
  let timeEl = null;
  let listInner = null;
  let playBtnIcon = null;
  let dockPlayBtnIcon = null; // 新增：用于存放 Dock 模式下的播放图标

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function isTouchDevice() { return "ontouchstart" in window || navigator.maxTouchPoints > 0; }
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function getState() { try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {}; } catch (e) { return {}; } }
  function saveState(partial) { try { const old = getState(); localStorage.setItem(CONFIG.storageKey, JSON.stringify(Object.assign({}, old, partial))); } catch (e) {} }

  function loadPersisted() {
    const s = getState();
    if (s.position && typeof s.position.x === "number" && typeof s.position.y === "number") {
      posX = s.position.x; posY = s.position.y;
    }
    if (s.volume != null) volume = clamp(s.volume, 0, 1);
    if (s.loopMode) loopMode = s.loopMode;
    if (s.orderMode) orderMode = s.orderMode;
    if (s.index != null) currentIndex = s.index;
  }

  function persistNow() {
    var t = 0;
    if (musicEngine) t = musicEngine.getCurrentTime();
    else if (audio) t = audio.currentTime || 0;
    saveState({ position: { x: posX, y: posY }, volume, loopMode, orderMode, index: currentIndex, time: t });
  }

  // =========================================================================
  // Phase 1 — Shell State projection (single writer for managed root classes)
  // Legacy flags remain source of truth; Renderer-style sync is the only place
  // that writes managed classList on #music-player.
  // =========================================================================
  const MANAGED_CLASSES = [
    "is-open", "is-docked", "dock-left", "dock-right",
    "is-dragging", "is-snapping", "is-dock-closing",
    "expand-left", "is-list-open", "is-list-closing", "list-up",
    "dock-list-open", "dock-down", "is-playing", "is-mobile",
    "no-hover-expand", "is-magnet", "magnet-left", "magnet-right"
  ];

  // Ephemeral UI flags that previously lived only on classList
  let shellSnapping = false;
  let shellDockClosing = false;
  let shellNoHoverExpand = false;
  let shellExpandLeft = false;
  let shellListClosing = false;
  let shellListUp = false;
  let shellDockDown = false;
  let shellMagnet = false;
  let shellMagnetSide = null; // "left" | "right" | null

  /**
   * Normalize-inspired projection: derive desired classes from legacy + shell flags.
   * Illegal combos are resolved here the same way baseline behaved.
   */
  function shellSync() {
    if (!root) return;

    const desired = new Set();

    // mobile / playing
    if (isMobile) desired.add("is-mobile");
    if (isPlaying) desired.add("is-playing");

    // dragging forces collapsed visual (baseline: collapse while drag)
    const effectivelyDragging = !!dragging;
    if (effectivelyDragging) desired.add("is-dragging");

    // dock: lastDockSide is the source of truth (set by setDocked / snap)
    const isDocked = !!lastDockSide && !effectivelyDragging;

    if (isDocked && lastDockSide) {
      desired.add("is-docked");
      if (lastDockSide === "left") desired.add("dock-left");
      if (lastDockSide === "right") desired.add("dock-right");
    }

    // open / dock expanded
    // baseline: is-open means PANEL open OR dock expanded
    if (!effectivelyDragging) {
      if (isDocked) {
        if (isOpen && !shellDockClosing) desired.add("is-open");
        if (shellDockClosing) desired.add("is-dock-closing");
      } else {
        if (isOpen) desired.add("is-open");
      }
    }

    // list
    if (!effectivelyDragging) {
      if (isListOpen && !shellListClosing) desired.add("is-list-open");
      if (shellListClosing) desired.add("is-list-closing");
      if (shellListUp && (isListOpen || shellListClosing)) desired.add("list-up");
    }

    if (isDockListOpen) desired.add("dock-list-open");
    if (shellDockDown && isDocked) desired.add("dock-down");

    // expand-left: position-based (desktop hover OR forced open).
    // Must NOT require isOpen — pure :hover expand never sets isOpen.
    // Ball stays put; CSS margin-left pulls the panel left when space on the right is insufficient.
    if (shellExpandLeft && !isDocked && !effectivelyDragging) {
      desired.add("expand-left");
    }

    // snapping / magnet / no-hover
    if (shellSnapping) desired.add("is-snapping");
    if (shellNoHoverExpand) desired.add("no-hover-expand");
    if (shellMagnet && effectivelyDragging) {
      desired.add("is-magnet");
      if (shellMagnetSide === "left") desired.add("magnet-left");
      if (shellMagnetSide === "right") desired.add("magnet-right");
    }

    // Apply — only managed classes
    for (let i = 0; i < MANAGED_CLASSES.length; i++) {
      const cls = MANAGED_CLASSES[i];
      const on = desired.has(cls);
      if (on) root.classList.add(cls);
      else root.classList.remove(cls);
    }
  }

  function applyTransform() {
    if (!root) return;
    root.style.transform = "translate(" + posX + "px," + posY + "px)";
  }

  // 修改1：新增宽高重写参数，预判移动端展开卡片时的边界，防止撑出版心
  function clampPosition(x, y, overrideW, overrideH) {
    if (!root) return [x, y];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = overrideW !== undefined ? overrideW : (root.offsetWidth || 66);
    const h = overrideH !== undefined ? overrideH : (root.offsetHeight || 66);
    const style = getComputedStyle(root);
    const leftBase = parseFloat(style.left) || 20;
    const bottomBase = parseFloat(style.bottom) || 20;
    const margin = 8;

    const minX = margin - leftBase;
    const maxX = vw - leftBase - w - margin;
    const minY = margin - vh + bottomBase + h;
    const maxY = bottomBase - margin;

    return [clamp(x, minX, maxX), clamp(y, minY, maxY)];
  }

  // =========================================================================
  // [Interaction:Snap] inlined from src/interaction/Snap.js
  // Owns: thresholds, magnetic hysteresis, snapToEdge → dock side
  // =========================================================================
  var snap = null;

  function ensureSnap() {
    if (snap) return snap;
    snap = createSnap(
      {
        snapThreshold: CONFIG.snapThreshold,
        snapRelease: CONFIG.snapRelease,
        snapThresholdMobile: CONFIG.snapThresholdMobile,
        snapReleaseMobile: CONFIG.snapReleaseMobile,
        ballSize: CONFIG.ballSize,
        ballSizeMobile: CONFIG.ballSizeMobile,
      },
      {
        isMobile: function () {
          return isMobile || window.innerWidth <= 600;
        },
        getRoot: function () {
          return root;
        },
        getPosX: function () {
          return posX;
        },
        getPosY: function () {
          return posY;
        },
        setPosition: function (x, y) {
          posX = x;
          posY = y;
          applyTransform();
        },
        clampPosition: function (x, y) {
          return clampPosition(x, y);
        },
        onSnapSide: function (side) {
          setDocked(side);
          if (typeof updateExpandDirection === "function") updateExpandDirection();
          persistNow();
        },
        onSnappingStart: function () {
          shellSnapping = true;
          shellSync();
        },
        onSnappingEnd: function () {
          shellSnapping = false;
          shellSync();
        },
        onMagnetChange: function (side) {
          magnetSide = side;
          shellMagnet = !!side;
          shellMagnetSide = side;
          shellSync();
        },
      }
    );
    return snap;
  }

  function getBallSize() {
    return ensureSnap().getBallSize();
  }
  function getSnapTargets() {
    return ensureSnap().getSnapTargets();
  }
  function getSnapDistances() {
    return ensureSnap().getSnapDistances();
  }
  function applyMagneticX(freeX, clientX, session) {
    return ensureSnap().applyMagneticX(freeX, clientX, session);
  }
  function snapToEdge() {
    if (!root) return;
    ensureSnap().snapToEdge();
  }
  function isNearDockEdge() {
    return ensureSnap().isNearDockEdge(posX);
  }
  function syncDockFromPosition() {
    if (!root || dragging) return;
    var side = ensureSnap().syncDockFromPosition(posX, dragging);
    setDocked(side);
  }

  // =========================================================================
  // [Interaction:Dock] inlined from src/interaction/Dock.js
  // Owns: side / expanded / closing (function-ball layer, not free PANEL)
  // =========================================================================
  var dockCtl = null;

  function ensureDock() {
    if (dockCtl) return dockCtl;
    dockCtl = createDock({
      closeAnimMs: 320,
      onDock: function (side) {
        lastDockSide = side;
        shellExpandLeft = false;
        shellDockDown = false;
        shellDockClosing = false;
        syncDockLoopBtn();
      },
      onUndock: function () {
        closeDockList();
        shellDockDown = false;
        shellDockClosing = false;
      },
      onExpandedChange: function (expanded) {
        isOpen = !!expanded;
        shellDockClosing = dockCtl.isClosing();
        if (!expanded) closeDockList();
      },
      onCloseAnimEnd: function () {
        shellDockClosing = false;
        guardToggle(400);
      },
      lockAnchor: function (side) {
        if (typeof lockDockAnchor === "function") lockDockAnchor(side || lastDockSide);
      },
      updateDirection: function () {
        if (typeof updateDockDirection === "function") updateDockDirection();
      },
      sync: function () {
        shellDockClosing = !!(dockCtl && dockCtl.isClosing());
        shellSync();
      },
    });
    return dockCtl;
  }

  // [Interaction:Dock] attach / detach edge mode
  function setDocked(side) {
    if (!root) return;
    var d = ensureDock();
    if (side === "left" || side === "right") {
      d.setSide(side);
    } else if (dragging) {
      // leave side memory for snap; only collapse expanded UI
      d.setSide(null);
      shellDockDown = false;
      shellSync();
    } else {
      closeDockList();
      d.clearSide();
      dockAnchorX = null;
      dockAnchorY = null;
      lastDockSide = null;
      shellDockClosing = false;
      shellDockDown = false;
      shellSync();
    }
  }

  // =========================================================================
  // [Interaction:Layout] inlined from src/interaction/Layout.js
  // Owns: expandLeft, mobile card geometry, list-up, dock-down
  // =========================================================================
  var layoutCtl = null;

  function ensureLayout() {
    if (layoutCtl) return layoutCtl;
    layoutCtl = createLayout({
      getRoot: function () {
        return root;
      },
      isMobile: function () {
        return !!isMobile;
      },
      isDocked: function () {
        return !!lastDockSide || (dockCtl && dockCtl.isDocked());
      },
      isDragging: function () {
        return !!dragging;
      },
      isOpen: function () {
        return !!isOpen;
      },
      getPosX: function () {
        return posX;
      },
      getPosY: function () {
        return posY;
      },
      clampPosition: function (x, y, w, h) {
        return clampPosition(x, y, w, h);
      },
      setPosition: function (x, y) {
        posX = x;
        posY = y;
        applyTransform();
      },
      getBallSize: function () {
        return getBallSize();
      },
      getDockSide: function () {
        return lastDockSide || null;
      },
      onExpandLeft: function (v) {
        shellExpandLeft = !!v;
      },
      onListUp: function (v) {
        shellListUp = !!v;
      },
      sync: function () {
        shellSync();
      },
    });
    return layoutCtl;
  }

  // [Interaction:Layout] PANEL expand-left when right space insufficient
  function updateExpandDirection() {
    ensureLayout().updateExpandDirection();
  }

  // [Music Widget:PlaylistSource] Meting fetch (parity with src/widgets/music/PlaylistSource.js)
  function buildApiUrl(template) { return template.replace(":server", CONFIG.server).replace(":type", CONFIG.type).replace(":id", CONFIG.id).replace(":r", String(Math.random())); }

  async function fetchPlaylist() {
    let lastErr = null;
    for (const api of CONFIG.apis) {
      try {
        const res = await fetch(buildApiUrl(api), { mode: "cors" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data.map((item, i) => ({ name: item.name || item.title || "Unknown", artist: item.artist || item.author || "Unknown", url: item.url, pic: item.pic || item.cover || "", lrc: item.lrc || "", index: i }));
        }
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("All Meting APIs failed");
  }

  // =========================================================================
  // Phase 2 — Template: single owner of Shell DOM structure + ref binding
  // (mirrors src/ui/Template.js; inlined for Hexo single-file drop-in)
  // Slots: cover → #mp-cover | panel → .mp-body | dock → #mp-dock-btns
  //        sheet → #mp-list + #mp-dock-list
  // =========================================================================
  const Template = {
    ROOT_STYLE:
      "position:fixed;left:20px;bottom:20px;z-index:99999;display:block;visibility:visible;opacity:1;pointer-events:auto;box-sizing:border-box",
    SHELL_HTML:
      '<div class="mp-main">' +
        '<div class="mp-cover" id="mp-cover"><div class="mp-cover-play"><i class="fas fa-play"></i></div></div>' +
        '<div class="mp-body">' +
          '<div class="mp-meta">' +
            '<div class="mp-title" id="mp-title">加载中...</div>' +
            '<div class="mp-artist" id="mp-artist">—</div>' +
          "</div>" +
          '<div class="mp-controller">' +
            '<div class="mp-progress-wrap" id="mp-progress"><div class="mp-progress-bar"><div class="mp-progress-played" id="mp-played"></div></div></div>' +
            '<div class="mp-time" id="mp-time">0:00 / 0:00</div>' +
            '<div class="mp-btns">' +
              '<button class="mp-btn" id="mp-loop" type="button" title="循环"><i class="fas fa-repeat"></i></button>' +
              '<button class="mp-btn" id="mp-prev" type="button" title="上一首"><i class="fas fa-step-backward"></i></button>' +
              '<button class="mp-btn" id="mp-play" type="button" title="播放/暂停"><i class="fas fa-play"></i></button>' +
              '<button class="mp-btn" id="mp-next" type="button" title="下一首"><i class="fas fa-step-forward"></i></button>' +
              '<button class="mp-btn" id="mp-list-btn" type="button" title="歌单"><i class="fas fa-list"></i></button>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="mp-dock-btns" id="mp-dock-btns" aria-hidden="true">' +
        '<button class="mp-dock-btn" id="mp-dock-play" type="button" title="播放/暂停"><i class="fas fa-play"></i></button>' +
        '<button class="mp-dock-btn" id="mp-dock-prev" type="button" title="上一首"><i class="fas fa-step-backward"></i></button>' +
        '<button class="mp-dock-btn" id="mp-dock-next" type="button" title="下一首"><i class="fas fa-step-forward"></i></button>' +
        '<button class="mp-dock-btn" id="mp-dock-loop" type="button" title="循环"><i class="fas fa-repeat"></i></button>' +
        '<button class="mp-dock-btn" id="mp-dock-list-btn" type="button" title="歌单"><i class="fas fa-list"></i></button>' +
      "</div>" +
      '<div class="mp-list" id="mp-list"><div class="mp-list-inner" id="mp-list-inner"><div class="mp-loading"><i class="fas fa-spinner"></i> 加载歌单...</div></div></div>',
    DOCK_LIST_HTML:
      '<div class="mp-dock-list-inner" id="mp-dock-list-inner"><div class="mp-loading"><i class="fas fa-spinner"></i> 加载歌单...</div></div>',

    createShell: function (parent) {
      const mount = parent || document.body;
      let el = document.getElementById("music-player");
      if (el) {
        if (!mount.contains(el)) mount.appendChild(el);
        return el;
      }
      el = document.createElement("div");
      el.id = "music-player";
      el.style.cssText = this.ROOT_STYLE;
      el.innerHTML = this.SHELL_HTML;
      mount.appendChild(el);
      return el;
    },

    createDockSheet: function (parent) {
      const mount = parent || document.body;
      let panel = document.getElementById("mp-dock-list");
      if (panel) {
        if (panel.parentElement && panel.parentElement.id === "music-player") mount.appendChild(panel);
        return panel;
      }
      panel = document.createElement("div");
      panel.className = "mp-dock-list";
      panel.id = "mp-dock-list";
      panel.setAttribute("aria-hidden", "true");
      panel.innerHTML = this.DOCK_LIST_HTML;
      mount.appendChild(panel);
      return panel;
    },

    bindRefs: function (rootEl) {
      const dockSheet = document.getElementById("mp-dock-list");
      return {
        root: rootEl,
        cover: $("#mp-cover", rootEl),
        title: $("#mp-title", rootEl),
        artist: $("#mp-artist", rootEl),
        played: $("#mp-played", rootEl),
        time: $("#mp-time", rootEl),
        progress: $("#mp-progress", rootEl),
        list: $("#mp-list", rootEl),
        listInner: $("#mp-list-inner", rootEl),
        body: $(".mp-body", rootEl),
        dockBtns: $("#mp-dock-btns", rootEl),
        playBtn: $("#mp-play", rootEl),
        playBtnIcon: $("#mp-play i", rootEl),
        prevBtn: $("#mp-prev", rootEl),
        nextBtn: $("#mp-next", rootEl),
        loopBtn: $("#mp-loop", rootEl),
        listBtn: $("#mp-list-btn", rootEl),
        dockPlay: $("#mp-dock-play", rootEl),
        dockPlayIcon: $("#mp-dock-play i", rootEl),
        dockPrev: $("#mp-dock-prev", rootEl),
        dockNext: $("#mp-dock-next", rootEl),
        dockLoop: $("#mp-dock-loop", rootEl),
        dockListBtn: $("#mp-dock-list-btn", rootEl),
        dockSheet: dockSheet,
        dockListInner: $("#mp-dock-list-inner", dockSheet || document),
      };
    },

    mount: function (parent) {
      const rootEl = this.createShell(parent);
      this.createDockSheet(parent);
      return { root: rootEl, refs: this.bindRefs(rootEl) };
    },
  };

  function createPlayerDOM() {
    return Template.createShell(document.body);
  }

  function ensureDockListPanel() {
    return Template.createDockSheet(document.body);
  }

  function updateCover(url) { if (coverEl) coverEl.style.backgroundImage = url ? `url("${url}")` : ""; }

  function updateMeta() {
    if (!playlist.length) return;
    const song = playlist[currentIndex];
    if (titleEl) titleEl.textContent = song.name;
    if (artistEl) artistEl.textContent = song.artist;
    updateCover(song.pic);
    const highlight = (container, shouldScroll) => {
      if (!container) return;
      container.querySelectorAll(".mp-list-item").forEach((item, i) => item.classList.toggle("active", i === currentIndex));
      const active = container.querySelector(".mp-list-item.active");
      if (active && shouldScroll) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    highlight(listInner, isListOpen);
    highlight(refs && refs.dockListInner ? refs.dockListInner : $("#mp-dock-list-inner"), isDockListOpen);
  }

  function updatePlayIcon() {
    const iconClass = isPlaying ? "fas fa-pause" : "fas fa-play";
    if (playBtnIcon) playBtnIcon.className = iconClass;
    if (dockPlayBtnIcon) dockPlayBtnIcon.className = iconClass;
    shellSync();
  }
  function updateProgress() {
    if (!playedEl || !timeEl) return;
    var cur = 0, dur = 0;
    if (musicEngine) {
      cur = musicEngine.getCurrentTime();
      dur = musicEngine.getDuration();
    } else if (audio) {
      cur = audio.currentTime || 0;
      dur = audio.duration || 0;
    } else return;
    playedEl.style.width = (dur > 0 ? (cur / dur) * 100 : 0) + "%";
    timeEl.textContent = formatTime(cur) + " / " + formatTime(dur);
  }

  function renderList() {
    const html = !playlist.length ? '<div class="mp-empty">歌单为空</div>' : playlist.map((s, i) => `
      <div class="mp-list-item${i === currentIndex ? " active" : ""}" data-index="${i}">
        <span class="mp-list-index">${i + 1}</span>
        <div class="mp-list-info">
          <div class="mp-list-name">${escapeHtml(s.name)}</div><div class="mp-list-artist">${escapeHtml(s.artist)}</div>
        </div>
      </div>`).join("");
    if (listInner) listInner.innerHTML = html;
    const dockInner = (refs && refs.dockListInner) || $("#mp-dock-list-inner");
    if (dockInner) dockInner.innerHTML = html;
  }

  function escapeHtml(str) { return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  // =========================================================================
  // Phase 4 — AudioEngine + Music Widget controller
  // (parity with src/media/AudioEngine.js + src/widgets/music/*)
  // Runtime/Shell does not own tracks; music lives in this controller surface.
  // =========================================================================
  var musicEngine = null;

  function ensureMusicEngine() {
    if (musicEngine) return musicEngine;
    musicEngine = createAudioEngine({
      onPlay: function () {
        isPlaying = true;
        updatePlayIcon();
        persistNow();
      },
      onPause: function () {
        isPlaying = false;
        updatePlayIcon();
        persistNow();
      },
      onTimeUpdate: function () {
        updateProgress();
      },
      onEnded: function () {
        if (loopMode === "one") {
          musicEngine.setCurrentTime(0);
          musicEngine.play();
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
    musicEngine.setVolume(volume);
    // legacy `audio` alias for persistNow / seek restore
    audio = musicEngine.getElement() || musicEngine.ensure();
    return musicEngine;
  }

  function ensureAudio() {
    var eng = ensureMusicEngine();
    audio = eng.getElement() || eng.ensure();
    return audio;
  }

  function loadSong(index, autoPlay) {
    if (!playlist.length) return;
    currentIndex = ((index % playlist.length) + playlist.length) % playlist.length;
    var eng = ensureMusicEngine();
    eng.setSource(playlist[currentIndex].url);
    audio = eng.getElement();
    updateMeta();
    persistNow();
    if (autoPlay) eng.play();
  }

  function togglePlay() {
    var eng = ensureMusicEngine();
    if (!eng.hasSource() && playlist.length) return loadSong(currentIndex, true);
    eng.toggle();
  }

  function playNext(force) {
    if (!playlist.length) return;
    var next = orderMode === "random" ? Math.floor(Math.random() * playlist.length) : currentIndex + 1;
    if (next >= playlist.length) {
      if (loopMode === "all" || force) next = 0;
      else return;
    }
    loadSong(next, true);
  }

  function playPrev() {
    if (!playlist.length) return;
    loadSong(currentIndex - 1 < 0 ? playlist.length - 1 : currentIndex - 1, true);
  }

  function onEnded() {
    if (loopMode === "one") {
      ensureMusicEngine().setCurrentTime(0);
      ensureMusicEngine().play();
    } else playNext(false);
  }

  function seek(ratio) {
    var eng = ensureMusicEngine();
    eng.seek(ratio);
    updateProgress();
  }

  function syncDockLoopBtn() {
    const btn = (refs && refs.dockLoop) || $("#mp-dock-loop");
    if (!btn) return;
    btn.classList.toggle("active", loopMode !== "none");
    btn.title = loopMode === "all" ? "列表循环" : loopMode === "one" ? "单曲循环" : "不循环";
    const icon = btn.querySelector("i");
    if (icon) icon.className = loopMode === "one" ? "fas fa-redo" : "fas fa-repeat";
  }

  function toggleLoop() {
    const modes = ["all", "one", "none"];
    loopMode = modes[(modes.indexOf(loopMode) + 1) % modes.length];
    const btn = (refs && refs.loopBtn) || $("#mp-loop");
    if (btn) {
      btn.classList.toggle("active", loopMode !== "none");
      btn.title = loopMode === "all" ? "列表循环" : loopMode === "one" ? "单曲循环" : "不循环";
      const icon = btn.querySelector("i");
      if (icon) icon.className = loopMode === "one" ? "fas fa-redo" : "fas fa-repeat";
    }
    syncDockLoopBtn(); persistNow();
  }

  // 修改2：移动端点击展开时，主动判断展开后的尺寸卡片是否越界，做位置补偿






  /** 是否贴在左右吸附区（不依赖 is-docked class，避免竞态） */
  function isNearDockEdge() {
    if (!root) return null;
    const { leftBase, w, leftX, rightX, vw } = getSnapTargets();
    const { enter } = getSnapDistances();
    const absLeft = leftBase + posX;
    const absRight = absLeft + w;
    const th = enter + 20;
    if (absLeft < th || Math.abs(posX - leftX) < 10) return "left";
    if (absRight > vw - th || Math.abs(posX - rightX) < 10) return "right";
    return null;
  }

  /** 理想贴边坐标（永远用 leftX/rightX，不用可能已被污染的 pos） */
  function idealDockPos(side) {
    const { leftX, rightX } = getSnapTargets();
    const x = side === "right" ? rightX : leftX;
    const ball = getBallSize();
    const [, y] = clampPosition(x, posY, ball, ball);
    return { x, y };
  }

  function lockDockAnchor(side) {
    if (!side) return;
    const p = idealDockPos(side);
    dockAnchorX = p.x;
    dockAnchorY = p.y;
    posX = p.x;
    posY = p.y;
    lastDockSide = side;
    applyTransform();
  }

  function restoreDockAnchor() {
    const side = lastDockSide || isNearDockEdge() || null;
    if (!side) return false;
    const p = idealDockPos(side);
    const changed = Math.abs(posX - p.x) > 0.5 || Math.abs(posY - p.y) > 0.5;
    posX = p.x;
    posY = p.y;
    dockAnchorX = p.x;
    dockAnchorY = p.y;
    if (changed) applyTransform();
    return changed;
  }


  function getMobileCardSize() {
    return ensureLayout().getMobileCardSize();
  }

  // [Interaction:Layout] mobile free-PANEL geometry
  function prepareMobileOpen() {
    if (!root || !isMobile) return;
    if (lastDockSide || shellDockClosing) return;
    if (typeof isNearDockEdge === "function" && isNearDockEdge()) return;
    if (typeof dockAnchorX !== "undefined" && dockAnchorX != null) return;
    ensureLayout().prepareMobileOpen();
  }

  function updateDockDirection() {
    if (!root) return;
    shellDockDown = ensureLayout().shouldDockDown();
    shellSync();
  }

  /**
   * 移动端点球：
   * - 吸附态只开关 Dock，绝不做大卡片 clamp / 改坐标
   * - 关闭动画期间完全忽略（防鬼点击把「关」变成「开」）
   * - 关闭后 ignore 窗口 > 合成 click 常见延迟（~300ms）
   */
  function toggleMobileBall() {
    // 同一次手势 / 重入：只响应一次，避免「同时关又开」
    if (ballToggleBusy) return;
    const now = Date.now();
    if (now < ignoreBallToggleUntil) return;
    if (shellDockClosing || ensureDock().isClosing()) return;

    ballToggleBusy = true;
    try {
      const near = isNearDockEdge();
      const d = ensureDock();
      const docked = !!lastDockSide || d.isDocked() || !!near;
      // dock expanded or free panel open
      const open = d.isDocked() ? d.isExpanded() || !!isOpen : !!isOpen;

      if (docked) {
        const side = near || lastDockSide || d.getSide() || "left";
        if (!d.isDocked() && !lastDockSide) setDocked(side);
        else lockDockAnchor(side);

        if (open) {
          guardToggle(1000);
          setOpen(false);
        } else {
          guardToggle(450);
          lockDockAnchor(side);
          setOpen(true);
        }
        return;
      }

      guardToggle(450);
      setOpen(!open);
    } finally {
      // 微任务结束后再解锁，挡住同步重入
      setTimeout(() => { ballToggleBusy = false; }, 50);
    }
  }



  /** 向左展开关闭前：取消过渡，避免 margin/width 不同步造成球瞬移 */
  /**
   * 向左展开收起：
   * 关键：先去掉 expand-left 会立刻变成「向右展开布局」，球看起来先跳到左边。
   * 做法：先只关 is-open，保留 expand-left 直到 width 过渡结束，再摘 expand-left。
   */





  function setOpen(open) {
    open = !!open;
    if (!root) {
      isOpen = open;
      return;
    }
    var d = ensureDock();
    if (open && (shellDockClosing || d.isClosing())) return;

    const near = typeof isNearDockEdge === "function" ? isNearDockEdge() : null;
    const docked = !!lastDockSide || d.isDocked() || (isMobile && !!near);

    if (docked) {
      const side = near || lastDockSide || d.getSide() || "left";
      if (!d.isDocked() && !lastDockSide) setDocked(side);
      else if (typeof lockDockAnchor === "function") lockDockAnchor(side);
      ensureLayout().setExpandLeft(false);

      // Dock expanded = function balls (not free PANEL)
      if (!open) {
        closeDockList();
        guardToggle(1000);
        d.setExpanded(false);
        return;
      }
      d.setExpanded(true);
      return;
    }

    isOpen = open;
    if (isOpen) {
      shellDockClosing = false;
      if (isMobile && typeof prepareMobileOpen === "function") prepareMobileOpen();
      else if (typeof updateExpandDirection === "function") updateExpandDirection();
    } else {
      ensureLayout().setExpandLeft(false);
    }
    shellSync();

    if (!isOpen) {
      if (isListOpen) {
        isListOpen = false;
        closeListAnimated();
      } else {
        isListOpen = false;
        shellListClosing = false;
        ensureLayout().setListUp(false);
        shellSync();
      }
    }
  }


  function updateListDirection() {
    ensureLayout().updateListDirection();
  }

  function closeListAnimated() {
    if (!root) return;
    const list = $("#mp-list", root);
    if (list && isListOpen) {
      list.style.maxHeight = (getComputedStyle(root).getPropertyValue("--mp-list-h").trim() || "280px");
      void list.offsetHeight;
    }
    isListOpen = false;
    shellListClosing = true;
    shellSync();
    if (list) requestAnimationFrame(() => list.style.maxHeight = "0px");
    setTimeout(() => {
      if (!root) return;
      shellListClosing = false;
      if (!isListOpen) ensureLayout().setListUp(false);
      shellSync();
      if (list) list.style.maxHeight = "";
    }, 420);
  }

  // 修改3：移动端直接屏蔽内联坐标注入，完全交给 CSS 的 fixed Bottom sheet 样式处理
  function positionDockList() {
    if (isMobile) {
      const panel = $("#mp-dock-list");
      if (panel) {
        panel.style.left = ''; panel.style.top = ''; panel.style.width = ''; panel.style.maxHeight = '';
      }
      return;
    }
    const panel = $("#mp-dock-list");
    if (!panel || !root) return;
    const btn = $("#mp-dock-list-btn");
    const anchor = (btn && btn.getBoundingClientRect().width) ? btn.getBoundingClientRect() : root.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, gap = 10, pad = 8;
    const maxW = Math.min(320, vw - pad * 2), preferredH = Math.min(280, vh - pad * 2);
    const isLeft = lastDockSide === "left";

    let left = isLeft ? Math.min(anchor.right + gap, Math.max(pad, vw - maxW - pad)) : Math.max(pad, anchor.left - gap - maxW);
    const spaceBelow = vh - pad - anchor.top, spaceAbove = anchor.bottom - pad;
    let top, maxH;

    if (spaceBelow >= preferredH || spaceBelow >= spaceAbove) {
      top = anchor.top; maxH = Math.min(preferredH, Math.max(120, spaceBelow));
      if (top + maxH > vh - pad) maxH = Math.max(120, vh - pad - top);
      panel.classList.remove("dock-list-up");
    } else {
      maxH = Math.min(preferredH, Math.max(120, spaceAbove)); top = anchor.bottom - maxH;
      if (top < pad) { top = pad; maxH = Math.max(120, anchor.bottom - pad); }
      panel.classList.add("dock-list-up");
    }
    panel.style.width = maxW + "px"; panel.style.maxHeight = maxH + "px"; panel.style.left = left + "px"; panel.style.top = top + "px";
  }

  // 修改4：放开限制，移动端强制允许打开 dockList（复用其成为全局 Bottom Sheet 歌单）
  function openDockList() {
    if (!isMobile && (!root || !lastDockSide)) return;
    ensureDockListPanel();
    isDockListOpen = true;
    if (isMobile) setOpen(true);
    shellSync();
    const panel = $("#mp-dock-list");
    if (panel) {
      panel.setAttribute("aria-hidden", "false");
      positionDockList();
      requestAnimationFrame(() => { positionDockList(); panel.classList.add("is-visible"); });
    }
    const btn = $("#mp-dock-list-btn");
    if (btn) btn.classList.add("active");
  }

  function closeDockList() {
    isDockListOpen = false;
    shellSync();
    const panel = $("#mp-dock-list");
    if (panel) { panel.classList.remove("is-visible"); panel.setAttribute("aria-hidden", "true"); }
    const btn = $("#mp-dock-list-btn");
    if (btn) btn.classList.remove("active");
  }

  function toggleDockList() {
    if (!isMobile && (!root || !lastDockSide)) return toggleList();
    if (isDockListOpen) closeDockList(); else openDockList();
  }

  // 修改5：移动端点击列表按钮，自动路由到 toggleDockList
  function toggleList() {
    if (isMobile || lastDockSide) return toggleDockList();
    if (!isOpen && isMobile) setOpen(true);
    isListOpen = !isListOpen;
    if (root) {
      if (isListOpen) {
        shellListClosing = false;
        updateListDirection(); updateExpandDirection();
        const list = $("#mp-list", root);
        if (list) list.style.maxHeight = "0px";
        shellSync();
        if (list) { void list.offsetHeight; list.style.maxHeight = ""; }
      } else {
        closeListAnimated();
      }
    }
  }

  function collapseToBall() {
    const wasListOpen = isListOpen;
    isListOpen = false;
    closeDockList();
    const near = typeof isNearDockEdge === "function" ? isNearDockEdge() : null;
    const docked = !!(lastDockSide || near);
    if (docked && isOpen) {
      guardToggle(1000);
      if (near && !lastDockSide) setDocked(near);
      setOpen(false);
    } else if (isOpen) {
      setOpen(false);
    } else {
      shellDockClosing = false;
      ensureLayout().setExpandLeft(false);
      shellSync();
    }
    if (wasListOpen) closeListAnimated();
    else {
      shellListClosing = false;
      ensureLayout().setListUp(false);
      shellSync();
    }
  }

  function onPlayerMouseLeave(e) {
    if (dragging) return;
    const related = e && e.relatedTarget;
    if (related && ((root && root.contains(related)) || (document.getElementById("mp-dock-list")?.contains(related)))) return;
    collapseToBall();
    shellNoHoverExpand = false;
    shellSync();
  }




  // =========================================================================
  // [Interaction:Gesture] inlined from src/interaction/Gesture.js
  // Owns: short/long press, click threshold, ghost-click guard, toggle intent
  // =========================================================================
  var gesture = null;
  var drag = null;

  // [Interaction:Drag] inlined from src/interaction/Drag.js
  function ensureDrag() {
    if (drag) return drag;
    drag = createDrag({
      getPosition: function () {
        return { x: posX, y: posY };
      },
      setPosition: function (x, y) {
        posX = x;
        posY = y;
        applyTransform();
      },
      clampPosition: function (x, y) {
        return clampPosition(x, y);
      },
      applyMagneticX: applyMagneticX,
      onDragBegin: function () {
        // UI collapse handled in Gesture onDragStart before begin()
      },
      onDragEnd: function () {
        // snap handled by endDragSession
      },
    });
    return drag;
  }

  function ensureGesture() {
    if (gesture) return gesture;
    gesture = createGesture(
      {
        longPressMs: CONFIG.longPressMs,
        clickThreshold: CONFIG.clickThreshold,
        longPressTapMax: 20,
      },
      {
        onToggle: function () {
          if (isMobile) toggleMobileBall();
          else togglePlay();
        },
        onLongPressTap: function (e) {
          var touch =
            (e && (e.pointerType === "touch" || e.pointerType === "pen")) ||
            isMobile ||
            window.innerWidth <= 600;
          if (!touch) return;
          if (window.Orbit && typeof window.Orbit.openLauncher === "function") {
            window.Orbit.openLauncher();
          }
        },
        onDragStart: function () {
          wasDragging = true;
          dragging = true;
          longPressTriggered = true;
          collapseToBall();
          setDocked(null);
          shellNoHoverExpand = true;
          shellSync();
          // Drag owns origin + position updates from here
          ensureDrag().begin({ x: posX, y: posY });
          originX = posX;
          originY = posY;
          var pid = gesture.getActivePointer();
          activePointer = pid;
          pointerId = pid;
          try {
            if (coverEl && pid != null) coverEl.setPointerCapture(pid);
          } catch (err) {}
        },
        isBlocked: function () {
          return !!shellDockClosing || Date.now() < ignoreBallToggleUntil;
        },
      }
    );
    return gesture;
  }

  /** Keep document-level ghost click guard in sync with Gesture */
  function guardToggle(ms) {
    ignoreBallToggleUntil = Math.max(ignoreBallToggleUntil || 0, Date.now() + (ms || 0));
    if (gesture) gesture.blockToggle(ms);
  }

  function endDragSession(commitSnap) {
    var g = ensureGesture();
    var d = ensureDrag();
    var pid = g.getActivePointer();
    document.removeEventListener("pointermove", onDocPointerMove);
    document.removeEventListener("pointerup", onDocPointerUp);
    document.removeEventListener("pointercancel", onDocPointerUp);
    if (pid != null && coverEl) {
      try {
        if (coverEl.hasPointerCapture && coverEl.hasPointerCapture(pid)) coverEl.releasePointerCapture(pid);
      } catch (err) {}
    }
    var wasDrag = wasDragging || dragging || g.isDragging() || d.isActive();
    g.cancel();
    d.end();
    dragging = false;
    longPressTriggered = false;
    activePointer = null;
    pointerId = null;
    longPressTimer = null;
    shellSync();
    if (wasDrag) {
      collapseToBall();
      shellNoHoverExpand = true;
      shellSync();
      if (commitSnap) snapToEdge();
    }
    wasDragging = false;
    return wasDrag;
  }

  // [Interaction:Gesture + Drag] pointer session on cover — Gesture owns press/toggle
  function onCoverPointerDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!coverEl || (e.target !== coverEl && !coverEl.contains(e.target))) return;
    var g = ensureGesture();
    if (g.getActivePointer() != null) return;

    ensureSnap().clearMagnet();
    magnetSide = null;
    shellMagnet = false;
    shellMagnetSide = null;
    shellSnapping = false;
    wasDragging = false;
    dragging = false;
    longPressTriggered = false;
    shellSync();

    var start = g.onPointerDown(e);
    if (!start) return;
    startClientX = start.startClientX;
    startClientY = start.startClientY;
    originX = posX;
    originY = posY;
    activePointer = g.getActivePointer();
    pointerId = activePointer;
    moveDist = 0;

    document.addEventListener("pointermove", onDocPointerMove, { passive: false });
    document.addEventListener("pointerup", onDocPointerUp, { passive: false });
    document.addEventListener("pointercancel", onDocPointerUp, { passive: false });
  }

  function onDocPointerMove(e) {
    var g = ensureGesture();
    var d = ensureDrag();
    if (e.pointerType === "mouse" && e.buttons === 0) {
      return endDragSession(wasDragging || dragging || g.isDragging() || d.isActive());
    }
    var phase = g.onPointerMove(e);
    if (phase === "ignore") return;

    if (g.isDragging()) {
      dragging = true;
      wasDragging = true;
    }
    var start = g.getStart();
    startClientX = start.x;
    startClientY = start.y;
    moveDist = g.getMoveDist();
    activePointer = g.getActivePointer();

    if (!g.isDragging() && !d.isActive()) return;
    e.preventDefault();
    // Drag owns delta → position (+ magnetic via applyMagneticX session)
    if (!d.isActive()) {
      d.begin({ x: posX, y: posY });
      originX = posX;
      originY = posY;
    }
    var dx = e.clientX - startClientX;
    var dy = e.clientY - startClientY;
    d.move(dx, dy, e.clientX, { startClientX: startClientX, x: startClientX });
    var o = d.getOrigin();
    originX = o.x;
    originY = o.y;
  }

  // 短按 → Gesture.onToggle；长按/滑动 → Drag（onDragStart 已处理）
  function onDocPointerUp(e) {
    var g = ensureGesture();
    var pid = g.getActivePointer();
    if (pid == null || e.pointerId !== pid) return;

    var wasDrag = wasDragging || dragging || g.isDragging();
    // Gesture cancel is inside endDragSession — resolve tap/long-press first
    if (!wasDrag) {
      g.onPointerUp(e, { wasDragging: false, pointerId: pid });
    }
    endDragSession(true);

    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (err) {}
  }


  function bindEvents() {
    if (!coverEl) return;
    coverEl.addEventListener("pointerdown", onCoverPointerDown);
    // 文档捕获阶段吞掉关闭后的合成 click（比只挡 cover 更稳）
    if (!window.__mpGhostClickBlocker) {
      window.__mpGhostClickBlocker = true;
      document.addEventListener("click", (e) => {
        var blocked =
          Date.now() < ignoreBallToggleUntil ||
          (gesture && Date.now() < gesture.getIgnoreUntil());
        if (blocked) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    }
    // 屏蔽 touch 后的合成 click，避免关闭 Dock 后又触发一次打开
    coverEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    root.addEventListener("mouseleave", onPlayerMouseLeave);
    root.addEventListener("mouseenter", () => {
      if (!isMobile) updateExpandDirection();
    });
    const dockPanel = ensureDockListPanel();
    dockPanel.addEventListener("mouseleave", (e) => {
      const related = e.relatedTarget;
      if (related && ((root && root.contains(related)) || dockPanel.contains(related))) return;
      onPlayerMouseLeave(e);
    });

    // Phase 2: prefer Template refs; fall back to query for safety
    const r = refs || Template.bindRefs(root);
    const bindEl = (el, fn) => {
      if (el) el.addEventListener("click", (e) => { e.stopPropagation(); fn(e); });
    };

    bindEl(r.playBtn, () => togglePlay());
    bindEl(r.dockPlay, () => togglePlay());
    bindEl(r.prevBtn, () => playPrev());
    bindEl(r.nextBtn, () => playNext(true));
    bindEl(r.listBtn, () => toggleList());
    bindEl(r.loopBtn, () => toggleLoop());
    bindEl(r.dockPrev, () => playPrev());
    bindEl(r.dockNext, () => playNext(true));
    bindEl(r.dockLoop, () => toggleLoop());
    bindEl(r.dockListBtn, () => toggleDockList());

    if (r.progress) {
      r.progress.addEventListener("click", (e) => {
        e.stopPropagation();
        seek((e.clientX - r.progress.getBoundingClientRect().left) / r.progress.getBoundingClientRect().width);
      });
    }

    const onListItemClick = (e) => {
      const item = e.target.closest(".mp-list-item"); if (!item) return;
      const idx = parseInt(item.dataset.index, 10); if (isNaN(idx)) return;
      loadSong(idx, true);
      if (isDockListOpen && isMobile) closeDockList();
    };
    if (r.listInner) r.listInner.addEventListener("click", onListItemClick);
    if (r.dockListInner) r.dockListInner.addEventListener("click", onListItemClick);

    document.addEventListener("pointerdown", (e) => {
      if (!isDockListOpen) return;
      const panel = r.dockSheet;
      const dockBtn = r.dockListBtn;
      if ((panel && panel.contains(e.target)) || (dockBtn && dockBtn.contains(e.target)) || (root && root.contains(e.target))) return;
      closeDockList();
    }, { passive: true });

    document.addEventListener("pointerdown", (e) => {
      if (!isMobile || (!isOpen && !isListOpen)) return;
      if (root && !root.contains(e.target)) {
        const dockList = r.dockSheet;
        if (dockList && dockList.contains(e.target)) return;
        collapseToBall();
      }
    }, { passive: true });

    window.addEventListener("resize", () => {
      // 当发生旋转等行为时重新更新 mobile 标志
      isMobile = window.innerWidth <= 600;
      const [nx, ny] = clampPosition(posX, posY);
      posX = nx; posY = ny; applyTransform(); syncDockFromPosition(); if (isDockListOpen) positionDockList();
      shellSync();
    });
    window.addEventListener("beforeunload", persistNow);
  }

  let initialized = false, eventsBound = false;

  /** @type {ReturnType<typeof Template.bindRefs> | null} */
  let refs = null;

  function cacheDOMRefs() {
    // Phase 2: all shell queries go through Template.bindRefs
    refs = Template.bindRefs(root);
    coverEl = refs.cover;
    titleEl = refs.title;
    artistEl = refs.artist;
    playedEl = refs.played;
    timeEl = refs.time;
    listInner = refs.listInner;
    playBtnIcon = refs.playBtnIcon;
    dockPlayBtnIcon = refs.dockPlayIcon;
  }

  function ensureVisibleOnScreen() {
    if (!root) return;
    if (root.classList && root.classList.contains("orbit-hidden")) return;
    root.style.cssText += ";display:block;visibility:visible;opacity:1;pointer-events:auto;z-index:99999;";
    const fix = () => {
      const before = { x: posX, y: posY }, [nx, ny] = clampPosition(posX, posY);
      posX = nx; posY = ny; applyTransform();
      if (Math.abs(before.x - nx) > 2 || Math.abs(before.y - ny) > 2) persistNow();
      const rect = root.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) { posX = 0; posY = 0; applyTransform(); persistNow(); }
      syncDockFromPosition();
    };
    requestAnimationFrame(() => requestAnimationFrame(fix));
  }

  async function init() {
    if (!document.body) return setTimeout(init, 50);
    isMobile = window.innerWidth <= 600;
    loadPersisted();
    // Phase 2: mount shell via Template
    const mounted = Template.mount(document.body);
    root = mounted.root;
    cacheDOMRefs();
    if (!coverEl) return;
    shellSync(); // Phase 1: initial class projection
    ensureVisibleOnScreen();
    if (!eventsBound) { bindEvents(); eventsBound = true; }

    const loopBtn = $("#mp-loop", root);
    if (loopBtn) {
      loopBtn.classList.toggle("active", loopMode !== "none");
      const icon = loopBtn.querySelector("i");
      if (icon) icon.className = loopMode === "one" ? "fas fa-redo" : "fas fa-repeat";
    }

    if (initialized && playlist.length) return updateMeta();
    initialized = true;

    try {
      playlist = await fetchPlaylist(); renderList();
      const s = getState();
      if (s.index != null && s.index < playlist.length) currentIndex = s.index;
      loadSong(currentIndex, false);
      if (s.time && audio) {
        const seekTo = () => { if (audio.readyState >= 1) { audio.currentTime = s.time; updateProgress(); audio.removeEventListener("loadedmetadata", seekTo); } };
        audio.addEventListener("loadedmetadata", seekTo);
      }
    } catch (err) {
      if (titleEl) titleEl.textContent = "加载失败"; if (artistEl) artistEl.textContent = "请检查网络或 API";
      if (listInner) listInner.innerHTML = '<div class="mp-empty">歌单加载失败</div>';
    }

    new MutationObserver(() => {
      const existing = document.getElementById("music-player");
      if (!existing || !document.body.contains(existing)) { if (root) { document.body.appendChild(root); ensureVisibleOnScreen(); } else init(); }
    }).observe(document.body, { childList: true });
  }

  function boot() {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
    document.addEventListener("pjax:complete", () => { setTimeout(() => { if (!document.getElementById("music-player")) { initialized = false; eventsBound = false; init(); } else ensureVisibleOnScreen(); }, 30); });
  }

/** 启动播放器（打包后会自动调用） */
export function startMusicPlayer() {
  boot();
}

export { boot, init };
