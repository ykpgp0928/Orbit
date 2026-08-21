# Phase 2 — Template / Shell DOM boundary

**Status:** In progress  
**Depends on:** Phase 1 ✅

## Goals

1. Shell DOM structure owned by a single **Template** module (HTML strings + create/mount).
2. Element refs obtained only via `Template.bindRefs(root)` (or the inlined equivalent).
3. No change to CSS selectors, animation curves, or interaction behavior.
4. Checklist remains green.

## Non-goals

- Do not rename `mp-*` classes yet (Music demo still uses baseline CSS).
- Do not split Drag/Snap/Gesture (Phase 3).
- Do not extract Music as Widget (Phase 4).

## Files

| Path | Role |
|------|------|
| `src/ui/Template.js` | Modular Template: `createShell`, `createDockSheet`, `bindRefs`, `mountShell`, `SLOT` |
| `working/music-player.js` | Inlined `Template` object (Hexo drop-in) + `refs` from `bindRefs` |
| `working/music-player.css` | Unchanged from baseline |

## Slot map (conceptual)

| Slot | Selector |
|------|----------|
| root | `#music-player` |
| cover | `#mp-cover` |
| panel | `.mp-body` |
| dock | `#mp-dock-btns` |
| sheet (in shell) | `#mp-list` |
| sheet (dock / mobile) | `#mp-dock-list` (body-level) |

## Acceptance

- [ ] Shell only created through Template.mount / createShell
- [ ] Primary UI refs come from `refs` / `cacheDOMRefs` → `bindRefs`
- [ ] Full interaction checklist still passes
- [ ] DOM structure identical to baseline (same ids/classes)

## Rollback

Use `baseline/music-player.js` or previous working commit before Template extraction.
