# Phase 3 — Interaction domain split

**Status:** In progress  
**Depends on:** Phase 2 ✅

## Goals

1. Extract interaction into explicit modules with clear ownership.
2. Working player keeps behavior; modules are the source of truth for the framework path.
3. Checklist stays green after each extraction step.

## Module ownership

| Module | Owns | Does not own |
|--------|------|----------------|
| **Gesture** | short/long press, click threshold, ghost-click guard, toggle intent | position, snap, audio |
| **Drag** | pointer session, delta → position | snap thresholds, dock UI |
| **Snap** | edge geometry, magnetic hysteresis, snap side | expanded dock buttons |
| **Dock** | side / expanded / closing | PANEL width, playlist |
| **Layout** | expandLeft, mobile card geometry, list-up, dock-down | pointer stream |

## Files

```text
src/interaction/
  Gesture.js
  Drag.js
  Snap.js
  Dock.js
  Layout.js
  index.js
```

## Migration order (do not skip checklist)

1. **Gesture** — toggle + long-press intents  
2. **Drag** — move session  
3. **Snap** — magnetic + snapToEdge  
4. **Dock** — side / expanded / closing  
5. **Layout** — expandLeft / mobile card / list-up  

After each step: run `docs/INTERACTION_CHECKLIST.md`.

## Working player strategy

- Hexo still uses single-file `working/music-player.js`.
- Live behavior remains in working until a step is fully delegated.
- Modular files are used by framework consumers and tests; working is updated step-by-step to call the same algorithms (or inlined copies kept in sync).

## Acceptance (Phase 3 done when)

- [ ] All five modules exist with documented APIs
- [ ] Working player either delegates to them or documents 1:1 parity
- [ ] Full checklist green
- [ ] No CSS curve / structure changes required

## Next after Phase 3

Phase 4 — Music Widget (`AudioEngine` + `registerWidget("music")`)
