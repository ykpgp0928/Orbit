# Phase 2 — Clock Pilot

**Status:** done  
**Host:** `src/host/clock-host.js`

## Delivered

| Item | Detail |
|------|--------|
| `createLifecycleScope()` | Created on each `init()` |
| Event cleanups | pointerdown/click/mouseenter/leave、document capture、resize |
| Widget timer | `clockApi.destroy()` clears `setInterval` |
| DOM | `#fwf-clock` removed on destroy |
| API | `destroyClockWidget()` / `destroy`、`getClockRoot()`、`getClockInstance()` |
| Remount | `destroy` 后再 `startClockWidget()` 可重建 |

## Manual check (×3)

```js
// 在加载了 clock 或 orbit 的页面控制台：
// 若仅有打包 IIFE，可从模块源调试；成品页：
location.reload(); // 基线

// 源码调试时：
import { startClockWidget, destroyClockWidget, getClockRoot } from "./src/host/clock-host.js";
for (let i = 0; i < 3; i++) {
  startClockWidget();
  console.assert(!!getClockRoot() || !!document.getElementById("fwf-clock"), "mounted");
  destroyClockWidget();
  console.assert(!document.getElementById("fwf-clock"), "destroyed round " + i);
}
startClockWidget();
```

打包页验收：三次刷新无异常；单次会话无法从 IIFE 外直接调 destroy 时，以源码/后续 Orbit.destroy 为准。

## Next

Phase 3 — Music Adapter（portal 所有权 + cleanup 清单），**在 Clock 销毁确认后再做**。
