# Floating Widget Framework (FWF)

**在任意网页上挂载可拖拽、可吸附的悬浮组件。**  
当前官方 Widget：音乐播放器 · 时钟。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](CHANGELOG.md)

> English: A tiny floating-widget runtime for static sites (Hexo, etc.). Shared drag / snap / expand behavior; Music and Clock are the first two widgets.

---

## 它是什么？

很多人只想在博客角落放一个**音乐球**或**时钟球**，并且：

- 能拖动、贴左右边
- 桌面和手机交互合理（悬停 / 点按）
- 不绑死某一个前端框架

FWF 把「悬浮壳的交互」和「里面是音乐还是时钟」分开：

| 层 | 负责什么 | 你日常要不要管 |
|----|----------|----------------|
| **成品 `dist/`** | 浏览器直接运行的 js + css | **博客用户主要用这个** |
| **源码 `src/`** | 交互模块、Widget、打包入口 | 想改逻辑、二次开发时用 |
| **GitHub** | 完整项目与文档 | 学习、提 Issue、改代码 |
| **npm（可选）** | 安装 `dist` 成品 | 用包管理器拉取文件 |

---

## 功能一览

### 音乐 (Music)

- 悬浮球 / 展开控制条 / 歌单
- 拖拽、边缘磁吸、Dock 功能键
- 桌面与移动端不同展开策略
- 通过 `window.FWF_MUSIC` 配置歌单（网易云等，Meting 接口）

### 时钟 (Clock)

- 球面上显示时间
- **桌面**：鼠标移入展开、移出收起  
- **手机**：点按开关，点外部关闭  
- 贴在右边缘时**向左展开**，避免超出屏幕

### 交互（两套 Widget 共用思路）

拖拽 · 长按与点击区分 · 边缘吸附 · 展开方向补偿  

---

## 你该走哪条路？

```text
我只想挂到 Hexo / 静态页
    → 用 dist/ 里的文件（下面「快速开始」）

我想改代码、自己打包
    → clone 本仓库，改 src/，执行 npm run build

我想用 npm 安装文件
    → npm install floating-widget-framework
      （包内主要是 dist/；改逻辑请 clone 本仓库）
```

---

## 快速开始（博客用户）

### 方式 A：从本仓库复制（最直观）

1. 下载或 clone 本仓库  
2. 需要的文件在 **`dist/`** 目录：

| 你想要 | 复制这两个文件 |
|--------|----------------|
| 音乐 | `floating-widget-music.js` + `floating-widget-music.css` |
| 时钟 | `floating-widget-clock.js` + `floating-widget-clock.css` |

3. 放到站点或主题的静态目录，例如 Hexo Butterfly：

```text
themes/butterfly/source/js/floating-widget-music.js
themes/butterfly/source/css/floating-widget-music.css
```

4. 在主题配置里引入（示例）：

```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/floating-widget-music.css">
  bottom:
    - <script>
        window.FWF_MUSIC = {
          server: "netease",
          type: "playlist",
          id: "你的歌单数字ID"
        };
      </script>
    - <script src="/js/floating-widget-music.js" defer></script>
```

5. 音乐按钮图标依赖 **Font Awesome**。主题若没有，在 head 增加 FA 的 CSS 链接。

6. 重新生成站点：

```bash
hexo clean && hexo generate && hexo server
```

**歌单 ID**：打开网易云歌单页，网址里 `id=` 后面的数字。

时钟同理，只引入 `floating-widget-clock` 的 css/js，**不需要** `FWF_MUSIC`。

### 方式 B：npm 安装后再复制

```bash
npm install floating-widget-framework
```

文件位于：

```text
node_modules/floating-widget-framework/dist/
```

把其中的 js/css 复制到你的主题或站点，引入方式与上面相同。

---

## 本地演示（看效果）

在项目根目录：

```bash
npx --yes serve -p 3456 .
```

浏览器打开：

| 页面 | 地址 |
|------|------|
| Music + Clock 一起 | http://127.0.0.1:3456/demo/ |
| 仅 Music | http://127.0.0.1:3456/test-dist.html |
| 仅 Clock | http://127.0.0.1:3456/test-clock.html |

---

## 配置（Music）

必须在 **music 的 js 之前** 设置（可选，有默认示例歌单）：

```html
<script>
  window.FWF_MUSIC = {
    server: "netease",   // 音源
    type: "playlist",    // playlist | song | album …
    id: "3778678"        // 歌单或歌曲 ID
  };
</script>
<script src="/js/floating-widget-music.js" defer></script>
```

完整说明：[docs/CONFIG.md](docs/CONFIG.md)

---

## 自定义外观

优先改 **CSS 变量**，不要改状态机逻辑。

时钟示例：

```css
.fwf-clock {
  --fwc-size: 72px;
  --fwc-panel-w: 200px;
  --fwc-bg: rgba(255, 255, 255, 0.55);
}
```

更多：[docs/THEME.md](docs/THEME.md)

---

## 开发者：改源码

```bash
git clone https://github.com/YOUR_USERNAME/floating-widget-framework.git
cd floating-widget-framework
npm run build          # 输出到 dist/
```

| 目录 | 含义 |
|------|------|
| `src/interaction/` | 手势、拖拽、吸附、Dock、布局 |
| `src/media/` | 音频引擎 |
| `src/widgets/` | Music / Clock 内容 |
| `src/host/` | 页面宿主（挂壳 + 挂 Widget） |
| `src/entry-*.js` | 打包入口 |
| `scripts/build.mjs` | 打包脚本 |
| `dist/` | 生成结果（给用户用） |

改完 `src/` 后必须再执行 `npm run build`，以更新 `dist/`。

API 概览：[docs/API.md](docs/API.md)

---

## 文档目录

| 文档 | 内容 |
|------|------|
| [docs/API.md](docs/API.md) | 能力与模块 |
| [docs/CONFIG.md](docs/CONFIG.md) | 配置项 |
| [docs/THEME.md](docs/THEME.md) | 主题变量 |
| [docs/PUBLISH.md](docs/PUBLISH.md) | 发布到 GitHub / npm |
| [CHANGELOG.md](CHANGELOG.md) | 版本记录 |

---

## 常见问题

**页面上没有球**  
检查 js/css 是否 404（浏览器 F12 → 网络）。路径是否和主题 `source` 生成结果一致。

**有球但图标是方块**  
缺少 Font Awesome，在 head 引入 FA 样式表。

**有球不能播放**  
检查 `id` 是否正确；公共 Meting API 有时不稳定，可换网络或稍后重试。

**npm 包里为什么没有完整开发体验？**  
npm 侧重「安装即用的 `dist`」。改交互与业务请以 **GitHub 源码** 为准，改完再 build。说明见社区讨论与本 README「你该走哪条路」。

**和 Hexo 强绑定吗？**  
不绑定。任意静态 HTML 引入 `dist` 即可；Hexo 只是常见用法。

---

## 版本与许可

- 当前版本：**0.1.0**（预览，API 仍可能小幅调整）  
- 许可：**MIT** — [LICENSE](LICENSE)

---

## 贡献

欢迎 Issue / PR：修 bug、补文档、加第三个 Widget（需复用同一套拖拽与吸附约定）。

提交前请尽量本地打开 `demo/` 确认拖拽与展开仍正常。
