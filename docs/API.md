# Orbit / FWF 公开 API（v0.4.0）

> 交付形态：浏览器单文件。  
> **多 Widget** 用 `dist/orbit.js`；**单 Widget** 用 music / clock 独立包。

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

**不要**再同时引入 `floating-widget-music.js` / `floating-widget-clock.js`。

### 1.1 打开管理面板

| 环境 | 方式 |
|------|------|
| 桌面 | `Alt+O`（`ORBIT.launcherKey` 可改） |
| 手机 | **长按**任意悬浮球约 0.5s，少滑动后松手 |
| 任意 | `Orbit.toggleLauncher()` / `openLauncher()` / `closeLauncher()` |
| 关闭 | `Esc`、点遮罩 |

### 1.2 `window.Orbit` API

| 方法 | 说明 |
|------|------|
| `mount(config?)` | 按配置启动（入口会自动调用） |
| `list()` | `[{ id, visible }]` |
| `listHosts()` | 已注册宿主 id |
| `setVisible(id, bool)` | 显示 / 隐藏 |
| `toggleLauncher()` | 开关管理面板 |
| `openLauncher()` / `closeLauncher()` | 开 / 关面板 |
| `getLauncherKey()` | 当前快捷键文案 |
| `on` / `off` | 事件（如 `visibilityChange`） |
| `version` | 如 `0.4.0` |
| `destroy(id, options?)` | **显式销毁**（配置里省略 id 不会销毁）；`options.forget: true` 同时清除该 widget 的持久化可见性偏好 |
| `get(id)` | 实例快照 |
| `register(definition)` | Widget 定义注册 |
| `exportProfile()` | 导出本地 Profile（schema / runtime 可见性 / 各 Widget 状态）为对象 |
| `importProfile(jsonOrObj)` | 导入 Profile（schema 严格校验、单项损坏容错、可见性合并）；返回 `{ ok, imported? } 或 { ok:false, error }` |

### 1.3 `window.ORBIT` 配置

| 字段 | 类型 | 说明 |
|------|------|------|
| `launcherKey` | string | 默认 `Alt+O` |
| `launcherHint` | boolean | 首次右下角提示，默认 true |
| `widgets` | array | `{ id: "music"\|"clock"\|"notice", visible?: boolean }` |
| `notice` | object | 可选 `{ title, text }`，公告标题与文本 |
| `persistVisibility` | boolean | 默认 true：开关状态写入 `localStorage["orbit-visible-v1"]`，刷新后保持用户偏好；`false` 禁用 |

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
| Orbit | `src/core/Orbit.js` |
| Launcher | `src/core/Launcher.js` |
| Gesture… | `src/interaction/*` |
| Hosts | `src/host/*` |

```bash
npm run build
```

生成 `dist/floating-widget-music.js`、`floating-widget-clock.js`、`orbit.js`。

---

## 5. 版本

| 版本 | 含义 |
|------|------|
| `0.1.x` | 单 Widget 成品 |
| `0.2.x` | Orbit 多 Widget + Launcher |
| `0.3.x` | destroy / LifecycleScope、ghost 恢复 |
| `0.4.x` | Runtime Hardening · Contract Alpha（开发中） |
| `1.0` | 计划锁定对外 API（未到） |
