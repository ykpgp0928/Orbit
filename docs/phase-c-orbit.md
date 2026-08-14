# Phase C — First-run launcher hint

**Status:** done  
**Version:** `0.2.0-c`

## Behavior

- When `Orbit.mount` runs and **≥ 2** hosts are registered
- And `ORBIT.launcherHint !== false`
- And `localStorage["orbit-launcher-hint-v1"]` is not set  
→ show a short tip (bottom-right) with the current hotkey, auto-dismiss ~5s or on close

## Config

```js
window.ORBIT = {
  launcherKey: "Alt+O",
  launcherHint: true, // false to disable
  widgets: [ ... ]
};
```

## Debug reset

```js
localStorage.removeItem("orbit-launcher-hint-v1")
location.reload()
```
