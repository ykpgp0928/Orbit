# Phase 1 — State + normalize + Renderer

**Status:** In progress  
**Depends on:** Phase 0 ✅ (`interaction-baseline-v1`)

## Goals

1. Introduce a single Shell state object (`BALL | PANEL | DOCK` + dock/layout/interaction flags).
2. All illegal combinations are corrected inside `normalize()`.
3. `Renderer.sync(state)` is the **only** place that writes managed `classList` values.
4. Existing player behavior and CSS remain unchanged (checklist must stay green).
5. Business logic (audio, playlist) still lives in the current script; only class projection is centralized.

## Non-goals (this phase)

- Do not split Drag/Snap/Gesture yet (Phase 3).
- Do not rename DOM or change CSS selectors/curves.
- Do not Widget-ize Music yet (Phase 4).
- Do not add TypeScript build step.

## New files

```text
src/
  config/defaults.js      ← baseline constants as defaults
  core/State.js           ← createState / patch / normalize
  core/EventEmitter.js    ← light bus
  ui/Renderer.js          ← state → classList
```

## Integration strategy (safe, incremental)

### Step A — Mount State + Renderer beside existing player

1. After `#music-player` is created, call:
   ```js
   import { createState } from "./src/core/State.js";
   import { createRenderer, bindStateToRenderer } from "./src/ui/Renderer.js";

   const store = createState({
     isMobile: window.innerWidth <= 600,
     position: { x: posX, y: posY },
   });
   const renderer = createRenderer(root);
   bindStateToRenderer(store, renderer);
   ```

2. Keep all existing logic running. Renderer will initially mirror state that we patch from old code.

### Step B — Replace direct classList with patch (one flag at a time)

Example: instead of

```js
root.classList.add("is-dragging");
```

do

```js
store.patch({ interaction: { dragging: true } });
// Renderer adds is-dragging
```

Suggested order (lowest risk first):

1. `is-playing`
2. `is-mobile` (resize)
3. `is-dragging` / `is-snapping`
4. `is-docked` / `dock-left` / `dock-right`
5. `is-open` / `is-dock-closing`
6. `expand-left` / list classes
7. magnet classes

After each replacement, run the relevant checklist section.

### Step C — Remove remaining direct managed classList writes

Search for `classList.add/remove/toggle` on the root that touch `MANAGED_CLASSES`.  
They must all go through `store.patch`.

## Normalize rules implemented

| Situation | Correction |
|-----------|------------|
| `PANEL` + `dragging` | → `mode = BALL`, close list |
| `DOCK` + `expandLeft` | clear `expandLeft` |
| `dock.expanded` while not `DOCK` | force `expanded = false` |
| `dock.closing` | force `expanded = false` |
| magnet while not dragging | clear magnet |
| invalid mode string | fallback `BALL` |

## Acceptance for Phase 1

- [ ] `createState` + `normalize` unit-smoke tested (illegal combos corrected)
- [ ] Renderer only toggles `MANAGED_CLASSES`
- [ ] At least `playing` / `dragging` / `docked` / `open` paths go through State
- [ ] Full interaction checklist still 100% green
- [ ] No CSS file changes required for this phase

## Rollback

If checklist fails: stop patching, remove `bindStateToRenderer`, old classList paths still work until deleted. Baseline snapshot in `baseline/` remains untouched.
