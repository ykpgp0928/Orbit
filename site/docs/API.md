# FWF 公开 API（v0.1）

> 当前交付形态：**打包后的单文件自动启动**。  
> 下面分为「今天就能用」与「框架演进中的目标 API」。

---

## 1. 今天就能用（浏览器 / Hexo）

### 1.1 Music

```html
<script>
  window.FWF_MUSIC = {
    server: "netease",
    type: "playlist",
    id: "3778678"
  };
</script>
<link rel="stylesheet" href="./floating-widget-music.css" />
<script src="./floating-widget-music.js" defer></script>
```

脚本加载后会自动：

1. 创建 `#music-player` 悬浮壳  
2. 拉取歌单并挂上 AudioEngine  
3. 绑定拖拽 / 吸附 / Dock  

**暂无**要求你手动调用 `init()`。

### 1.2 Clock

```html
<link rel="stylesheet" href="./floating-widget-clock.css" />
<script src="./floating-widget-clock.js" defer></script>
```

自动创建 `#fwf-clock`。

- 桌面：悬停展开 / 移出关闭  
- 移动：点按开关；点外部关闭  
- 右吸附：向左展开  

### 1.3 配置对象 `window.FWF_MUSIC`

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `server` | string | `"netease"` | 音源平台（Meting 约定） |
| `type` | string | `"playlist"` | `playlist` / `song` / `album` 等 |
| `id` | string | 示例 ID | 歌单或歌曲 ID |

须在 **music 脚本之前** 赋值。

---

## 2. 源码层模块（给二次开发）

打包前可从 `src/` 引用（需自己打包）：

| 模块 | 路径 | 作用 |
|------|------|------|
| Gesture | `src/interaction/Gesture.js` | `createGesture(config, handlers)` |
| Drag | `src/interaction/Drag.js` | `createDrag(ctx)` |
| Snap | `src/interaction/Snap.js` | `createSnap(config, ctx)` |
| Dock | `src/interaction/Dock.js` | `createDock(handlers)` |
| Layout | `src/interaction/Layout.js` | `createLayout(ctx)` |
| AudioEngine | `src/media/AudioEngine.js` | `createAudioEngine(handlers)` |
| WidgetRegistry | `src/core/WidgetRegistry.js` | `registerWidget` / `mountWidget` |
| Music Widget | `src/widgets/music/MusicWidget.js` | `registerWidget("music")` |
| Clock Widget | `src/widgets/clock/ClockWidget.js` | `registerWidget("clock")` |

### 2.1 Widget 约定

```js
registerWidget("id", {
  mount(ctx) { /* return controller */ },
  unmount?(controller) {}
});
```

`ctx` 至少可包含：`root`、`refs`、`config`、`options`。

---

## 3. 目标 Runtime API（后续版本，设计冻结草案）

```js
const widget = createFloatingWidget({
  id: "music",
  position: { corner: "bottom-right" },
  behavior: { snap: true, drag: true, longPress: true }
});

widget.open();
widget.close();
widget.toggle();
widget.dock();
widget.undock();
widget.setPosition(x, y);
widget.getState();
widget.destroy();
widget.on("modeChange", handler);
widget.off("modeChange", handler);
```

v0.1 **尚未**在 `dist` 暴露上述对象；行为已在 Host 内实现。Phase 6 文档将其定为下一版对外表面。

---

## 4. 版本语义

| 版本 | 含义 |
|------|------|
| `0.x` | 预览：允许调整 API |
| `1.0` | 锁定 `createFloatingWidget` 与配置 schema |

当前：**0.1.0**
