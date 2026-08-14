# Phase S — Orbit singleton skeleton

**Status:** done  
**Version tag:** `0.2.0-s`

## Goals

1. `src/core/Orbit.js` — stable public API shells  
2. `WidgetRegistry` as **subsystem** under `Orbit.registry`  
3. `window.Orbit` after loading `dist/orbit.js`  
4. No change to Music / Clock hand-feel or auto-start entries  

## Public API (Phase S)

| Method | Behavior in S |
|--------|----------------|
| `Orbit.mount(config?)` | Idempotent; stores config; no widget hosts yet |
| `Orbit.list()` | Instance list (empty until Phase A) |
| `Orbit.listRegistered()` | Definition ids from registry |
| `Orbit.setVisible(id, bool)` | Records intent + emits `visibilityChange` |
| `Orbit.toggleLauncher()` | Emit only; no UI |
| `Orbit.on` / `Orbit.off` | Minimal event bus |
| `Orbit.registry.*` | `register` / `get` / `list` / `mountWidget` |

## Files

- `src/core/Orbit.js`
- `src/entry-orbit.js`
- `dist/orbit.js` (via `npm run build`)
- `src/core/WidgetRegistry.js` (comment only)

## Acceptance

- [x] `window.Orbit` exists after orbit bundle  
- [x] `list` / `setVisible` callable without throw  
- [x] Music / Clock entries unchanged  

## Next

**Phase A** — real multi-widget `mount` + DOM visibility wired to hosts.
