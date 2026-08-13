# Phase 4 — Music Widget

**Status:** In progress (AudioEngine + registry + modular MusicWidget landed; working wired to AudioEngine)

## Goals

1. Playback lives in **AudioEngine** (no shell knowledge of tracks beyond UI callbacks).
2. Playlist fetch/normalize in **PlaylistSource**.
3. **MusicWidget** is `registerWidget("music")` with `mount(ctx)`.
4. Working player uses AudioEngine surface; full thin-host split can continue.

## Files

```text
src/media/AudioEngine.js
src/widgets/music/PlaylistSource.js
src/widgets/music/MusicWidget.js
src/core/WidgetRegistry.js
```

## Boundary

| Layer | Knows |
|-------|--------|
| Shell / Interaction | position, mode, gestures — **not** track URLs |
| AudioEngine | HTMLAudioElement |
| PlaylistSource | Meting APIs, Track shape |
| MusicWidget | ties engine + playlist + ui hooks |

## Acceptance

- [ ] Play / pause / next / prev / seek / loop still work
- [ ] Playlist load + list highlight
- [ ] Persist index / time / volume
- [ ] Shell drag/dock unchanged

## Next

Phase 5 — second widget (Clock) to prove Shell is not Music-only.
