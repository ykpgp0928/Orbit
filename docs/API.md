# Orbit 公开 API（v0.4.0）

> 交付形态：浏览器单文件。  
> **多 Widget** → `dist/orbit.js`；**单 Widget** → `floating-widget-music.js` / `floating-widget-clock.js`。  
> Contract 稳定性：`0.4 experimental`（见 [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md)）。

---

## 1. 多 Widget：`orbit.js`（推荐）

```html
<link rel="stylesheet" href="./floating-widget-music.css" />
<link rel="stylesheet" href="./floating-widget-clock.css" />
<script>
  window.FWF_MUSIC = { server: "netease", type: "playlist", id: "3778678" };
  window.ORBIT = {
    launcherKey: "Alt+O",
    launcherHint: true,
    widgets: [
      { id: "music", visible: true },
      { id: "clock", visible: true }
    ]
  };
</script>
<script src="./orbit.js" defer></script>
```

**不要**再同时引入 music/clock 独立入口脚本。

### 1.1 打开管理面板

| 环境 | 方式 |
|------|------|
| 桌面 | `Alt+O`（`ORBIT.launcherKey` 可改） |
| 手机 | **长按**任意悬浮球约 0.5s |
| 脚本 | `Orbit.toggleLauncher()` / `openLauncher()` / `closeLauncher()` |
| 关闭 | `Esc`、点遮罩 |

面板列表默认 = `ORBIT.widgets` 中的 id（见 `listLauncherIds()` / `launcherShowAll`）。

### 1.2 `window.Orbit` API

| 方法 / 属性 | 说明 |
|------|------|
| `mount(config?)` | 按配置启动（入口脚本会自动调用） |
| `list()` | 已挂载实例：`[{ id, visible }]` |
| `listHosts()` | 全部已注册宿主 id |
| `listLauncherIds()` | Launcher 实际展示的 id（尊重 `widgets` / `launcherShowAll`） |
| `get(id)` | 实例快照：`{ id, visible, started, destroyed }` |
| `getLabel(id)` | 展示名（Contract `label` → 回退 id） |
| `setVisible(id, bool)` | 显示 / 隐藏（隐藏 ≠ 销毁） |
| `destroy(id, options?)` | **显式销毁**；配置里省略 id **不会**销毁。`options.forget: true` 时清除该 id 的持久化可见性 |
| `register(definition)` | 注册 Widget 定义（Contract） |
| `toggleLauncher()` / `openLauncher()` / `closeLauncher()` | 管理面板 |
| `getLauncherKey()` | 当前快捷键文案 |
| `exportProfile()` / `importProfile(jsonOrObj)` | Profile 导入导出，见 [PROFILE.md](./PROFILE.md) |
| `on` / `off` | 事件（如 `visibilityChange`、`mount`、`widgetError`） |
| `version` | 如 `"0.4.0"` |
| `getConfig()` | 当前已合并配置的浅拷贝 |
| `isMounted()` | Runtime 是否已 `mount` |

### 1.3 `window.ORBIT` 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `launcherKey` | string | 默认 `Alt+O` |
| `launcherHint` | boolean | 首次提示，默认 true |
| `widgets` | array | `{ id, visible? }`；id 常用 `music` / `clock` / `notice` |
| `launcherShowAll` | boolean | 默认 false：面板只列 `widgets`；true 列全部已注册 |
| `notice` | object | `{ title, text, position, offset, top, right, bottom, left, zIndex }`，见 [CONFIG.md](./CONFIG.md) |
| `persistVisibility` | boolean | 默认 true → `localStorage["orbit-visible-v1"]` |
| `launcherFallback` | string | `ghost` / `host-button` / `none` |

完整说明与 Notice 位置预设见 [CONFIG.md](./CONFIG.md)。

### 1.4 语义（0.4 已固定）

| 语义 | 说明 |
|------|------|
| 隐藏 ≠ 销毁 | `setVisible(false)` 可再打开；资源仍由实例持有 |
| 销毁须显式 | `destroy(id)`；从 `widgets` 省略 id **不**销毁已挂载实例 |
| 配置与偏好 | 用户开关偏好（若开启持久化）优先于 `widgets[].visible` |

---

## 2. 仅 Music

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

| 字段 | 说明 |
|------|------|
| `server` | 音源（Meting） |
| `type` | `playlist` / `song` / … |
| `id` | 歌单或歌曲 ID |

---

## 3. 仅 Clock

```html
<link rel="stylesheet" href="./floating-widget-clock.css" />
<script src="./floating-widget-clock.js" defer></script>
```

- 桌面：悬停展开 / 移出关闭  
- 移动：点按；点外部关闭  
- 右吸附：向左展开  

---

## 4. 源码模块（二次开发）

| 模块 | 路径 |
|------|------|
| Orbit / Launcher | `src/core/` |
| Gesture / Drag / … | `src/interaction/` |
| Music / Clock Host | `src/host/` |
| Notice 等 Widget | `src/widgets/` |
| 参考 Widget | `examples/reference-widget/` |

```bash
npm run build    # dist/floating-widget-music.js | clock | orbit.js
npm run verify   # 构建 + 测试 + 链接 / 打包检查
```

第三方接入请读 [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md)，不要依赖 `src/` 私有路径。

---

## 5. 版本

| 版本 | 含义 |
|------|------|
| `0.1.x` | 单 Widget 成品 |
| `0.2.x` | 多 Widget + Launcher |
| `0.3.x` | destroy / LifecycleScope、ghost 恢复 |
| `0.4.x` | Runtime Hardening · Contract Alpha · Notice · Profile Alpha |
| `1.0` | 计划锁定对外 API（需外部采用验证，见 [PILOT.md](./PILOT.md)） |
