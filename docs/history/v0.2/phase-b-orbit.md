# Phase B — Launcher panel + hotkey

**Status:** done  
**Version:** `0.2.0-b`

## Features

- Panel `#orbit-launcher` (not a floating ball)
- Default hotkey **`Alt+O`** (configurable via `ORBIT.launcherKey`)
- **Esc** or click backdrop to close
- Per-widget switches → `Orbit.setVisible`
- Styles injected automatically (no extra CSS file required)

## API

```js
Orbit.toggleLauncher()
Orbit.openLauncher()
Orbit.closeLauncher()
Orbit.getLauncherKey() // "Alt+O"
```

## Config

```js
window.ORBIT = {
  launcherKey: "Alt+O",
  widgets: [
    { id: "music", visible: true },
    { id: "clock", visible: true }
  ]
};
```

## Next

Phase C — first-run hint when ≥2 widgets.
