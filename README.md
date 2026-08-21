# Orbit

**在任意网页上挂载可拖拽、可吸附的悬浮组件。**

对外品牌：**Orbit**  
技术说明：Floating Widget Runtime（原 FWF）  
当前版本：**0.4.0**（Runtime Hardening · Contract Alpha，开发中）

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.0-green.svg)](CHANGELOG.md)

> English: Orbit is a tiny floating-widget runtime for static sites (Hexo, etc.). Shared drag / snap / expand; Music and Clock are the first widgets. Multi-widget pages use `dist/orbit.js` and a launcher panel.

---

## 它是什么？

博客或静态站角落需要「音乐球 / 时钟球」时，Orbit 提供：

- 拖动、贴左右边、展开方向补偿  
- 桌面 / 手机不同交互  
- **多组件同页**时统一管理（显隐）  
- 不依赖 React / Vue  

| 层 | 作用 | 谁用 |
|----|------|------|
| **`dist/`** | 浏览器直接跑的 js / css | 博客与示例站 |
| **`src/`** | 源码与打包入口 | 二次开发 |
| **GitHub** | 完整仓库与文档 | 学习、Issue、PR |
| **npm（可选）** | 拉取成品 | 包管理安装 |

---

## 功能一览

### Music

悬浮球 · 控制条 · 歌单 · 拖拽磁吸 · Dock · `window.FWF_MUSIC` 配置歌单  

### Clock

球面时间 · 桌面悬停展开 · 手机点按 · 贴边与上下左右展开策略  

### Notice（0.4）

可折叠站点公告卡 · 关闭记忆（Profile 持久化，刷新不打扰）· 独立样式 `floating-widget-notice.css`

> **启用方式**：公告不会自动出现——需要在 `window.ORBIT.widgets` 中显式加入
> `{ id: "notice", visible: true }`（与 music/clock 一样）。未加入时它只出现在
> Launcher 面板中且开关为「关」，点开即启用。可选配置 `window.ORBIT.notice = { text }`。

### Orbit Runtime（0.2）

| 能力 | 桌面 | 手机 |
|------|------|------|
| 同页多 Widget | `dist/orbit.js` | 同左 |
| 管理面板 | **`Alt+O`**（可配置） | **长按**任意球（少滑动） |
| 关闭面板 | Esc / 点遮罩 | 同左 |
| 首次提示 | 有 ≥2 个组件时出现一次 | 文案会提示长按 |

单组件页面仍可用 `floating-widget-music.js` / `floating-widget-clock.js`，**不要**与 `orbit.js` 同时引入。

---

## 快速开始

### 多组件（推荐体验完整 Orbit）

```html
<link rel="stylesheet" href="/css/floating-widget-music.css" />
<link rel="stylesheet" href="/css/floating-widget-clock.css" />
<script>
  window.FWF_MUSIC = { server: "netease", type: "playlist", id: "你的歌单ID" };
  window.ORBIT = {
    launcherKey: "Alt+O",
    launcherHint: true,
    widgets: [
      { id: "music", visible: true },
      { id: "clock", visible: true }
    ]
  };
</script>
<script src="/js/orbit.js" defer></script>
```

需要 Font Awesome（Music 图标）。

### 仅 Music / 仅 Clock

| 目标 | 文件 |
|------|------|
| 音乐 | `floating-widget-music.js` + `.css` |
| 时钟 | `floating-widget-clock.js` + `.css` |

拷到主题 `source/js`、`source/css` 后 inject 即可（见下方 Hexo）。

### 本地演示

```bash
npm run build
npx --yes serve -p 3456 .
```

| 页面 | 地址 |
|------|------|
| 示例首页 | http://127.0.0.1:3456/ |
| 总览（Orbit） | http://127.0.0.1:3456/demo/ |
| 仅 Music | http://127.0.0.1:3456/test-dist.html |
| 仅 Clock | http://127.0.0.1:3456/test-clock.html |


### 官网与在线演示

- **官网：** [https://orbit.ykpgp0928.dpdns.org/](https://orbit.ykpgp0928.dpdns.org/)
- **测试 / Demo 页：** [https://orbit.ykpgp0928.dpdns.org/demo](https://orbit.ykpgp0928.dpdns.org/demo)（Music + Clock + Orbit Launcher）

备用域名（内容通常同步）：

- https://fwf.ykpgp0928.dpdns.org  
- https://floating-widget-framework.ykpgp0928.dpdns.org


---

## 配置摘要

### `window.ORBIT`

| 字段 | 说明 |
|------|------|
| `launcherKey` | 默认 `"Alt+O"` |
| `launcherHint` | 是否首次提示，默认开启 |
| `widgets` | `[{ id, visible }]`，`id` 为 `music` / `clock` / `notice` |
| `notice` | 可选 `{ title, text }`：公告标题与文本（配置优先，主题更新即时生效） |
| `persistVisibility` | 默认开启：用户的开/关操作写入 `localStorage`（`orbit-visible-v1`），刷新后保持；关闭公告同理。设 `false` 禁用持久化 |

### `window.FWF_MUSIC`

| 字段 | 说明 |
|------|------|
| `server` / `type` / `id` | Meting 音源约定 |

详见 [docs/CONFIG.md](docs/CONFIG.md)、[docs/API.md](docs/API.md)。

### 控制台（加载 orbit.js 后）

```js
Orbit.list()
Orbit.setVisible("music", false)
Orbit.toggleLauncher()
```

调试首次提示：

```js
localStorage.removeItem("orbit-launcher-hint-v1")
location.reload()
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

把 `dist/` 中对应文件放进主题 `source`。仅音乐时只引 music 的 js/css，不要引 `orbit.js`。

---

## 开发

```bash
npm run build          # → dist/music|clock|orbit
npm run prepare-site   # → site/ 供 Cloudflare 等静态部署
```

| 目录 | 含义 |
|------|------|
| `src/core/` | Orbit、Launcher、Registry |
| `src/interaction/` | Gesture、Drag、Snap、Dock、Layout、ExpandPolicy |
| `src/host/` | Music / Clock 宿主 |
| `src/widgets/` | Widget 内容 |
| `src/entry-*.js` | 打包入口 |
| `docs/` | 公开文档（API / Contract / Profile…） |
| `docs/plans/` | 版本方案（v0.4 / v0.5） |
| `docs/history/` | 历史阶段记录（按版本：`v0.1/` / `v0.2/` / `v0.3/`） |
| `legacy/` | 历史 CSS/JS 快照（build 回退用） |
| `examples/` | 外部作者参考 Widget |
| `tests/` | 单元与 DOM 回归 |

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/API.md](docs/API.md) | 接入与 Orbit API |
| [docs/CONFIG.md](docs/CONFIG.md) | 配置项 |
| [docs/THEME.md](docs/THEME.md) | 主题变量 |
| [docs/PROFILE.md](docs/PROFILE.md) | Profile 导出 / 导入 / 清除 |
| [docs/CONTRACT-ALPHA.md](docs/CONTRACT-ALPHA.md) | Widget Contract Alpha 接入指南 |
| [docs/PILOT.md](docs/PILOT.md) | **外部试点说明**（征集站长 / Widget 作者） |
| [docs/SECURITY.md](docs/SECURITY.md) | 安全注记（CSP / 外部音源 / 动态文本） |
| [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md) | 发布检查清单（真机矩阵） |
| [docs/history/v0.1/](docs/history/v0.1/) | 0.1 阶段记录（FWF 基线 → Music/Clock 成品） |
| [docs/history/v0.2/phase-s-orbit.md](docs/history/v0.2/phase-s-orbit.md) ~ [phase-c](docs/history/v0.2/phase-c-orbit.md) | 0.2 阶段记录 |
| [docs/PUBLISH.md](docs/PUBLISH.md) | GitHub / npm |
| [docs/history/v0.3/v0.3-iteration.md](docs/history/v0.3/v0.3-iteration.md) | **v0.3 迭代流程与清单** |
| [docs/MIGRATION-v0.3.md](docs/MIGRATION-v0.3.md) | 0.2 → 0.3 迁移 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 二次开发 / Widget 约定 |
| [docs/history/v0.3/phase0-v0.3-freeze.md](docs/history/v0.3/phase0-v0.3-freeze.md) | v0.3 Phase 0 基线冻结 |
| [docs/plans/v0.4-runtime-hardening.md](docs/plans/v0.4-runtime-hardening.md) | **v0.4 方案**：Runtime Hardening |
| [docs/plans/v0.4-midterm-review.md](docs/plans/v0.4-midterm-review.md) | v0.4 半程评估 |
| [docs/plans/v0.5-external-adoption.md](docs/plans/v0.5-external-adoption.md) | **v0.5 方案**：外部采用验证 |
| [CHANGELOG.md](CHANGELOG.md) | 版本记录 |

---

## 版本与许可

- **0.4.x**：Runtime Hardening · Contract Alpha（开发中）
- **0.3.x**：destroy / LifecycleScope、ghost fallback、CI
- **0.2.x**：Orbit 多 Widget、Launcher、移动端长按  
- **0.1.x**：单文件 Music / Clock 成品  
- 许可：**MIT** — [LICENSE](LICENSE)
