# Phase 3 — Completed (Interaction domain wired)

**Status:** ✅ Gesture · Drag · Snap · Dock · Layout all delegated in `working/music-player.js`

## Module map

| Module | ensure* | Primary responsibilities |
|--------|---------|--------------------------|
| Gesture | `ensureGesture` | short/long press, ghost guard, toggle intent |
| Drag | `ensureDrag` | origin, delta → position |
| Snap | `ensureSnap` | magnetic X, snapToEdge, near-edge |
| Dock | `ensureDock` | side / expanded / closing |
| Layout | `ensureLayout` | expandLeft, mobile card, list-up, dock-down |

Modular sources: `src/interaction/*.js` (parity with inlined implementations).

## Next

Phase 4 — Music Widget (`AudioEngine` + `registerWidget("music")`)
