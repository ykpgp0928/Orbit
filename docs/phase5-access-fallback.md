# Phase 5 — Access & Fallback

**Status:** done  
**Runtime:** `0.3.0-phase5`

## Launcher a11y

- Open: focus moves to panel title (then first control)
- **Tab** cycles inside panel
- Close (Esc / mask): focus returns to trigger (or body)
- `openLauncher(triggerEl)` accepts focus restore target (ghost button uses this)

## `launcherFallback`

```js
window.ORBIT = {
  launcherFallback: "ghost", // "ghost" | "host-button" | "none"
};
```

| Mode | Behavior |
|------|----------|
| **ghost** (default) | Show fixed ◎ button only when **coarse pointer** and **zero visible** widgets |
| **host-button** | No ghost; host calls `Orbit.openLauncher(btn)` |
| **none** | No automatic recovery UI |

Ghost is **not** a Widget: no drag, not in list, 48×48 (≥44), `aria-label="管理 Orbit 组件"`.

## Manual test (mobile / DevTools coarse)

1. Hide music + clock via Launcher  
2. Ghost ◎ appears bottom-right  
3. Tap → Launcher opens → turn a widget on → ghost hides  
4. Desktop: Alt+O / Esc / focus still work  

## Files

- `src/core/LauncherFallback.js` (new)
- `src/core/Launcher.js` (focus trap)
- `src/core/Orbit.js` (wire + sync)
- `dist/orbit.js`
