# Phase 3 — Music Adapter

**Status:** done (adapter-style; not a full Host rewrite)

## Delivered

| Resource | Cleanup |
|----------|---------|
| AudioEngine | `musicEngine.destroy()` |
| MutationObserver on body | `disconnect()` |
| `pjax:complete` | named handler + `removeEventListener` |
| **Owned portal** `#mp-dock-list` | only if created this session (`claimOwnedPortal` / `data-orbit-portal`) |
| `#music-player` root | removed on destroy |
| LifecycleScope | created on init when needed |

## API

```js
window.__FWF_MUSIC_API__.destroy()
window.__FWF_MUSIC_API__.start()
```

Source: `destroyMusicPlayer` export from `src/host/music-player-host.js`.

## Portal ownership rule

- **Only** remove dock-list nodes pushed via `claimOwnedPortal` when **this** instance created the panel.
- Do **not** `getElementById("mp-dock-list")` and blindly remove foreign nodes.

## Known residual (acceptable for 3)

- Some **anonymous** `document`/`cover` listeners from `bindEvents` may remain until full page navigation (would need named handlers refactor in a later pass).
- `window.__mpGhostClickBlocker` stays page-lifetime (once).

## Manual check

```js
__FWF_MUSIC_API__.destroy()
document.getElementById("music-player") // null
// optional: only remove dock list if data-orbit-portal was ours
__FWF_MUSIC_API__.start()
```

Hand-feel: drag / dock / list / mobile card still OK.

## Next

Phase 4 — Runtime API 收口（省略 widgets ≠ destroy；Music 显隐特判下沉 Instance）。
