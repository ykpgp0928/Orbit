# Phase A — Multi-widget mount + visibility

**Status:** done  
**Version:** `0.2.0-a`

## What landed

1. `Orbit.registerHost(id, { start, getRoot })`
2. `Orbit.mount(config)` starts configured widgets (default: all registered hosts)
3. `Orbit.setVisible(id, bool)` shows/hides host root DOM (`display`)
4. `dist/orbit.js` bundles Music + Clock hosts + Orbit
5. `demo/index.html` uses **only** `orbit.js` (no double entry-music/clock)

## Config

```html
<script>
  window.FWF_MUSIC = { server: "netease", type: "playlist", id: "3778678" };
  window.ORBIT = {
    widgets: [
      { id: "music", visible: true },
      { id: "clock", visible: true }
    ]
  };
</script>
<script src="./dist/orbit.js" defer></script>
<link rel="stylesheet" href="./dist/floating-widget-music.css" />
<link rel="stylesheet" href="./dist/floating-widget-clock.css" />
```

## Console

```js
Orbit.list()
Orbit.setVisible("music", false)
Orbit.setVisible("clock", true)
Orbit.listHosts() // ["music","clock"]
```

## Non-goals (still Phase B+)

- Launcher panel UI
- Hotkey Alt+O
- First-run hint

## Notes

- Single-widget pages keep `floating-widget-music.js` / `floating-widget-clock.js`
- Do not load those **and** `orbit.js` on the same page
