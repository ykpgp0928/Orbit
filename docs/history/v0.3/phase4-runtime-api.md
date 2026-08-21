# Phase 4 — Runtime API 收口

**Status:** done  
**Runtime version string:** `0.3.0-phase4`

## Public API

```js
Orbit.mount(config?)
Orbit.register(definition)
Orbit.registerHost(id, adapter)   // legacy
Orbit.list()
Orbit.get(id)
Orbit.setVisible(id, boolean)     // hide ≠ destroy
Orbit.destroy(id, options?)       // explicit only
Orbit.openLauncher() / closeLauncher() / toggleLauncher()
Orbit.on / Orbit.off
```

## Semantics

| Action | Meaning |
|--------|---------|
| `setVisible(id, false)` | Hide DOM; keep instance |
| `destroy(id)` | Teardown host (`destroyMusicPlayer` / `destroyClockWidget`) |
| `mount({ widgets: [...] })` | **Only updates listed ids**. Omitted mounted ids are **left as-is** (not destroyed) |

## No Runtime music hardcode

Visibility targets come from adapter:

```js
registerHost("music", {
  getVisibilityTargets() { /* root + data-orbit-portal */ }
})
```

## entry-orbit

Wires `destroy` + `getVisibilityTargets` for Music; `destroy` for Clock.

## Manual checks

```js
Orbit.setVisible("music", false)  // hidden
Orbit.list()
Orbit.destroy("clock")            // removed
Orbit.mount({ widgets: [{ id: "music", visible: true }] })
// clock stays destroyed; music shown — omitting clock does not revive or error
```
