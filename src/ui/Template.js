/**
 * FWF UI — Template (Phase 2)
 *
 * Owns Shell DOM structure and ref binding.
 * Selectors / class names stay aligned with baseline CSS (mp-* for Music demo).
 *
 * Slot map (conceptual):
 *   cover  → .mp-cover
 *   panel  → .mp-body
 *   dock   → .mp-dock-btns
 *   sheet  → #mp-list (in-shell) + #mp-dock-list (body-level)
 */

export const SLOT = {
  root: "#music-player",
  cover: "#mp-cover",
  panel: ".mp-body",
  dock: "#mp-dock-btns",
  sheetInShell: "#mp-list",
  sheetDock: "#mp-dock-list",
};

const ROOT_STYLE =
  "position:fixed;left:20px;bottom:20px;z-index:99999;display:block;visibility:visible;opacity:1;pointer-events:auto;box-sizing:border-box";

const SHELL_HTML = `
  <div class="mp-main">
    <div class="mp-cover" id="mp-cover"><div class="mp-cover-play"><i class="fas fa-play"></i></div></div>
    <div class="mp-body">
      <div class="mp-meta">
        <div class="mp-title" id="mp-title">加载中...</div>
        <div class="mp-artist" id="mp-artist">—</div>
      </div>
      <div class="mp-controller">
        <div class="mp-progress-wrap" id="mp-progress"><div class="mp-progress-bar"><div class="mp-progress-played" id="mp-played"></div></div></div>
        <div class="mp-time" id="mp-time">0:00 / 0:00</div>
        <div class="mp-btns">
          <button class="mp-btn" id="mp-loop" type="button" title="循环"><i class="fas fa-repeat"></i></button>
          <button class="mp-btn" id="mp-prev" type="button" title="上一首"><i class="fas fa-step-backward"></i></button>
          <button class="mp-btn" id="mp-play" type="button" title="播放/暂停"><i class="fas fa-play"></i></button>
          <button class="mp-btn" id="mp-next" type="button" title="下一首"><i class="fas fa-step-forward"></i></button>
          <button class="mp-btn" id="mp-list-btn" type="button" title="歌单"><i class="fas fa-list"></i></button>
        </div>
      </div>
    </div>
  </div>
  <div class="mp-dock-btns" id="mp-dock-btns" aria-hidden="true">
    <button class="mp-dock-btn" id="mp-dock-play" type="button" title="播放/暂停"><i class="fas fa-play"></i></button>
    <button class="mp-dock-btn" id="mp-dock-prev" type="button" title="上一首"><i class="fas fa-step-backward"></i></button>
    <button class="mp-dock-btn" id="mp-dock-next" type="button" title="下一首"><i class="fas fa-step-forward"></i></button>
    <button class="mp-dock-btn" id="mp-dock-loop" type="button" title="循环"><i class="fas fa-repeat"></i></button>
    <button class="mp-dock-btn" id="mp-dock-list-btn" type="button" title="歌单"><i class="fas fa-list"></i></button>
  </div>
  <div class="mp-list" id="mp-list"><div class="mp-list-inner" id="mp-list-inner"><div class="mp-loading"><i class="fas fa-spinner"></i> 加载歌单...</div></div></div>
`;

const DOCK_LIST_HTML =
  '<div class="mp-dock-list-inner" id="mp-dock-list-inner"><div class="mp-loading"><i class="fas fa-spinner"></i> 加载歌单...</div></div>';

/**
 * Create or reuse the floating shell root.
 * @param {ParentNode} [parent=document.body]
 * @returns {HTMLElement}
 */
export function createShell(parent) {
  const mount = parent || document.body;
  let el = document.getElementById("music-player");
  if (el) {
    if (!mount.contains(el)) mount.appendChild(el);
    return el;
  }
  el = document.createElement("div");
  el.id = "music-player";
  el.style.cssText = ROOT_STYLE;
  el.innerHTML = SHELL_HTML;
  mount.appendChild(el);
  return el;
}

/**
 * Dock playlist panel must live on body (fixed + parent transform isolation).
 * @param {ParentNode} [parent=document.body]
 * @returns {HTMLElement}
 */
export function createDockSheet(parent) {
  const mount = parent || document.body;
  let panel = document.getElementById("mp-dock-list");
  if (panel) {
    if (panel.parentElement && panel.parentElement.id === "music-player") {
      mount.appendChild(panel);
    }
    return panel;
  }
  panel = document.createElement("div");
  panel.className = "mp-dock-list";
  panel.id = "mp-dock-list";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = DOCK_LIST_HTML;
  mount.appendChild(panel);
  return panel;
}

/**
 * Bind all Shell + sheet refs used by the Music demo host.
 * @param {HTMLElement} root
 * @returns {object}
 */
export function bindRefs(root) {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const dockSheet = document.getElementById("mp-dock-list");

  return {
    root,
    cover: $("#mp-cover", root),
    title: $("#mp-title", root),
    artist: $("#mp-artist", root),
    played: $("#mp-played", root),
    time: $("#mp-time", root),
    progress: $("#mp-progress", root),
    list: $("#mp-list", root),
    listInner: $("#mp-list-inner", root),
    body: $(".mp-body", root),
    dockBtns: $("#mp-dock-btns", root),
    playBtn: $("#mp-play", root),
    playBtnIcon: $("#mp-play i", root),
    prevBtn: $("#mp-prev", root),
    nextBtn: $("#mp-next", root),
    loopBtn: $("#mp-loop", root),
    listBtn: $("#mp-list-btn", root),
    dockPlay: $("#mp-dock-play", root),
    dockPlayIcon: $("#mp-dock-play i", root),
    dockPrev: $("#mp-dock-prev", root),
    dockNext: $("#mp-dock-next", root),
    dockLoop: $("#mp-dock-loop", root),
    dockListBtn: $("#mp-dock-list-btn", root),
    dockSheet,
    dockListInner: $("#mp-dock-list-inner", dockSheet || document),
  };
}

/**
 * Mount shell + dock sheet and return refs.
 * @param {ParentNode} [parent]
 */
export function mountShell(parent) {
  const root = createShell(parent);
  createDockSheet(parent);
  const refs = bindRefs(root);
  return { root, refs };
}
