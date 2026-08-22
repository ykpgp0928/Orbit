# Orbit

**在静态网页上挂载可拖拽、可统一管理的悬浮组件。**

| | |
|------|------|
| 品牌 | **Orbit** |
| 形态 | Floating Widget Runtime（历史名 FWF） |
| 版本 | **0.4.0** — Runtime Hardening · Contract Alpha |
| 许可 | [MIT](LICENSE) |

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.0-green.svg)](CHANGELOG.md)

> English: Orbit is a floating-widget runtime for static sites (Hexo, etc.). No React/Vue. Shared interaction primitives; official widgets are Music, Clock, and Notice. Multi-widget pages use `dist/orbit.js` and a Launcher panel.

---

## 它是什么？

博客或静态站需要「音乐球 / 时钟 / 公告」时，Orbit 提供：

- 拖动、贴边、展开方向补偿（Music / Clock）
- 桌面与手机不同的交互入口
- **多组件同页**时统一显隐（Launcher）
- 不依赖 React / Vue；数据默认只存浏览器本地

| 层 | 作用 | 谁用 |
|----|------|------|
| **`dist/`** | 浏览器直接跑的 js / css | 博客与示例站 |
| **`src/`** | 源码与打包入口 | 二次开发 |
| **GitHub** | 完整仓库与文档 | 学习、Issue、PR |
| **npm（可选）** | 拉取成品 | 包管理安装 |

**定位：** Runtime 是产品，官方 Widget 是样本。Contract 仍为 **0.4 experimental**（允许 v0.5 一次受控调整）；正在征集外部站点与 Widget 作者试点，见 [docs/PILOT.md](docs/PILOT.md)。

---

## 功能一览

### Music

悬浮球 · 控制条 · 歌单 · 拖拽磁吸 · Dock · `window.FWF_MUSIC` 配置歌单  
实现位于 `src/host/music-player-host.js`（Contract 最小适配层；业务壳尚未全拆进 `src/widgets/`）。

### Clock

球面时间 · 桌面悬停展开 · 手机点按 · 贴边与展开策略 · 位置写入 Profile（旧键 `fwf-clock-pos-v1` 自动迁移）

### Notice

可折叠站点公告 · 关闭后走 Runtime 显隐并持久化 · **站长可配置位置** · 样式 `floating-widget-notice.css`

> **启用：** 须在 `ORBIT.widgets` 中显式加入 `{ id: "notice", visible: true }`。  
> 未列入 `widgets` 时：**不会挂载，也不会出现在 Launcher**（除非设置 `launcherShowAll: true`）。  
> 文案与位置：`window.ORBIT.notice = { title, text, position }`，见 [CONFIG.md](docs/CONFIG.md)。

### Runtime / Launcher

| 能力 | 桌面 | 手机 |
|------|------|------|
| 同页多 Widget | `dist/orbit.js` | 同左 |
| 管理面板 | **`Alt+O`**（可配置） | **长按**任意球 |
| 关闭面板 | Esc / 点遮罩 | 同左 |
| 面板列表 | 默认只显示 `ORBIT.widgets` 里声明的 id | 同左 |

单组件页面可用 `floating-widget-music.js` / `floating-widget-clock.js`，**不要**与 `orbit.js` 同时引入。

---

## 快速开始

### 多组件（推荐）

```html
<link rel="stylesheet" href="/css/floating-widget-music.css" />
<link rel="stylesheet" href="/css/floating-widget-clock.css" />
<!-- 若启用 notice，再加 floating-widget-notice.css -->
<script>
  window.FWF_MUSIC = { server: "netease", type: "playlist", id: "你的歌单ID" };
  window.ORBIT = {
    launcherKey: "Alt+O",
    launcherHint: true,
    widgets: [
      { id: "music", visible: true },
      { id: "clock", visible: true }
      // { id: "notice", visible: true }
    ]
    // notice: { title: "公告", text: "…", position: "top-right" }
  };
</script>
<script src="/js/orbit.js" defer></script>
```

Music 图标依赖 Font Awesome（主题按需引入）。

### 仅 Music / 仅 Clock

| 目标 | 文件 |
|------|------|
| 音乐 | `floating-widget-music.js` + `.css` |
| 时钟 | `floating-widget-clock.js` + `.css` |

拷到主题 `source/js`、`source/css` 后 inject（见下方 Hexo）。

### 本地演示

```bash
npm run build
npx --yes serve -p 3456 .
```

| 页面 | 地址 |
|------|------|
| 示例首页 | http://127.0.0.1:3456/ |
| Demo（多 Widget） | http://127.0.0.1:3456/demo/ |
| 仅 Music | http://127.0.0.1:3456/test-dist.html |
| 仅 Clock | http://127.0.0.1:3456/test-clock.html |

### 在线

- 官网：https://orbit.ykpgp0928.dpdns.org/
- Demo：https://orbit.ykpgp0928.dpdns.org/demo

---

## 配置摘要

### `window.ORBIT`

| 字段 | 说明 |
|------|------|
| `launcherKey` | 默认 `"Alt+O"` |
| `launcherHint` | 是否首次提示，默认开启 |
| `widgets` | `[{ id, visible }]`；决定**挂载谁**，并默认决定 **Launcher 列出谁** |
| `launcherShowAll` | `true` 时面板列出全部已注册宿主（含未写入 `widgets` 的） |
| `notice` | `{ title, text, position, offset, top, right, bottom, left, zIndex }` |
| `persistVisibility` | 默认开启：开关写入 `localStorage["orbit-visible-v1"]` |
| `launcherFallback` | `ghost`（默认）/ `host-button` / `none` |

### `window.FWF_MUSIC`

| 字段 | 说明 |
|------|------|
| `server` / `type` / `id` | Meting 音源约定 |

详见 [docs/CONFIG.md](docs/CONFIG.md)、[docs/API.md](docs/API.md)。

### 控制台（加载 `orbit.js` 后）

```js
Orbit.list()              // 已挂载实例
Orbit.listHosts()         // 全部已注册 id
Orbit.listLauncherIds()   // 面板实际展示的 id
Orbit.setVisible("music", false)
Orbit.toggleLauncher()
Orbit.exportProfile()
```

---

## Hexo 示例

```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/floating-widget-music.css">
    - <link rel="stylesheet" href="/css/floating-widget-clock.css">
  bottom:
    - <script>window.FWF_MUSIC={server:"netease",type:"playlist",id:"你的ID"}</script>
    - <script>window.ORBIT={launcherKey:"Alt+O",widgets:[{id:"music",visible:true},{id:"clock",visible:true}]}</script>
    - <script src="/js/orbit.js" defer></script>
```

将 `dist/` 对应文件放入主题 `source`。仅音乐时只引 music 的 js/css，不要引 `orbit.js`。

---

## 开发

```bash
npm run build          # → dist/music|clock|orbit
npm run verify         # build + 单测 + DOM + links + pack
npm run prepare-site   # → site/ 静态部署目录
```

| 目录 | 含义 |
|------|------|
| `src/core/` | Orbit、Launcher、Registry、LifecycleScope |
| `src/interaction/` | Gesture、Drag、Snap、Dock、Layout、ExpandPolicy |
| `src/host/` | Music / Clock 宿主（Music 业务主实现） |
| `src/widgets/` | Notice 等 Contract Widget；`music/` 目录为空壳（实现在 host） |
| `src/entry-*.js` | 打包入口 |
| `examples/` | 外部作者参考 Widget |
| `docs/` | 公开文档 |
| `docs/plans/` | v0.4 / v0.5 方案 |
| `docs/history/` | 历史阶段（`v0.1/` · `v0.2/` · `v0.3/`） |
| `tests/` | 单元与 DOM 回归 |

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/API.md](docs/API.md) | 接入与 `window.Orbit` API |
| [docs/CONFIG.md](docs/CONFIG.md) | 全部配置项（含 Notice 位置） |
| [docs/CONTRACT-ALPHA.md](docs/CONTRACT-ALPHA.md) | Widget Contract Alpha |
| [docs/PROFILE.md](docs/PROFILE.md) | Profile 导出 / 导入 |
| [docs/THEME.md](docs/THEME.md) | 主题变量与状态类 |
| [docs/PILOT.md](docs/PILOT.md) | **外部试点说明** |
| [docs/SECURITY.md](docs/SECURITY.md) | CSP / 音源 / 动态文本 |
| [docs/MIGRATION-v0.3.md](docs/MIGRATION-v0.3.md) | 0.2 → 0.3 迁移 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 二次开发约定 |
| [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) | 发布检查清单 |
| [docs/PUBLISH.md](docs/PUBLISH.md) | GitHub / npm |
| [docs/plans/v0.4-runtime-hardening.md](docs/plans/v0.4-runtime-hardening.md) | v0.4 方案 |
| [docs/plans/v0.5-external-adoption.md](docs/plans/v0.5-external-adoption.md) | v0.5 方案 |
| [CHANGELOG.md](CHANGELOG.md) | 版本记录 |

---

## 版本与许可

| 版本 | 含义 |
|------|------|
| **0.4.x** | Runtime Hardening · Contract Alpha · Notice · Profile Alpha |
| **0.3.x** | destroy / LifecycleScope、ghost fallback、CI |
| **0.2.x** | 多 Widget、Launcher、移动端长按 |
| **0.1.x** | 单文件 Music / Clock |
| **1.0** | 计划锁定对外 API（需外部采用验证后） |

许可：**MIT** — [LICENSE](LICENSE)
