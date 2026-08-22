# 配置说明（Configuration）

面向 **站长 / 主题维护者**。所有配置均在引入对应 JS **之前**写入 `window`。

---

## 1. Orbit（`window.ORBIT`）— 多组件推荐

使用 `dist/orbit.js` 时：

```html
<script>
  window.FWF_MUSIC = { server: "netease", type: "playlist", id: "你的歌单ID" };
  window.ORBIT = {
    launcherKey: "Alt+O",
    launcherHint: true,
    launcherShowAll: false,
    persistVisibility: true,
    launcherFallback: "ghost",
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

**不要**再同时引入 `floating-widget-music.js` / `floating-widget-clock.js`（会双启动）。

### 字段

| 字段 | 默认 | 说明 |
|------|------|------|
| `launcherKey` | `"Alt+O"` | 桌面打开管理面板的快捷键 |
| `launcherHint` | `true` | 首次在「可展示组件 ≥ 2」时右下角提示 |
| `widgets` | 见下 | 声明要**加载**的组件；也决定 Launcher **默认列出**哪些开关 |
| `launcherShowAll` | `false` | `true`：面板列出全部已注册宿主；`false`：只列出 `widgets` 中的 id |
| `persistVisibility` | `true` | 用户开关写入 `localStorage["orbit-visible-v1"]`，刷新后保持 |
| `launcherFallback` | `"ghost"` | 全部隐藏时的恢复：`ghost` / `host-button` / `none` |
| `notice` | — | 公告文案与位置，见第 2 节 |

### `widgets` 与 Launcher

| 情况 | 挂载行为 | Launcher 列表 |
|------|----------|----------------|
| 写了非空 `widgets` | 只对列表内且已注册的 id 调用挂载/显隐 | 默认只显示这些 id |
| 未写 / 空数组 | 对所有已注册且 `defaultVisible !== false` 的宿主尝试挂载 | 显示全部已注册 |
| `launcherShowAll: true` | 与上表挂载规则相同 | 强制显示全部已注册 |

官方 `orbit.js` 会注册 `music`、`clock`、`notice`，但 **Notice 的 `defaultVisible` 为 false**，未写入 `widgets` 时不会自动挂载，也不会出现在面板（除非 `launcherShowAll`）。

手机：**长按**悬浮球打开与桌面快捷键同一套面板。

清除首次提示：

```js
localStorage.removeItem("orbit-launcher-hint-v1");
```

---

## 2. Notice（`window.ORBIT.notice`）

须先在 `widgets` 中加入 `{ id: "notice", visible: true }`，并引入 `floating-widget-notice.css`。

```js
window.ORBIT = {
  widgets: [{ id: "notice", visible: true }],
  notice: {
    title: "公告",
    text: "欢迎访问本站。",
    position: "top-right",
    offset: 20
    // top: 16, right: 24, zIndex: 99989
  }
};
```

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `title` | string | `"公告"` | 卡片标题（`textContent`，不解析 HTML） |
| `text` | string | 内置欢迎文案 | 正文；**配置优先于** Profile 中的历史文本 |
| `position` | string | `"top-right"` | 预设位置，见下表 |
| `offset` | number \| string | `20` | 预设边距（number 为 px） |
| `top` / `right` / `bottom` / `left` | number \| string | — | 距视口对应边的距离；覆盖预设同轴对边为 `auto` |
| `zIndex` | number \| string | `99989` | 层叠顺序 |

**`position` 预设：** `top-left` · `top-right` · `top-center` · `bottom-left` · `bottom-right` · `bottom-center`

位置与文案均由**站长配置**决定，不写入用户 Profile。关闭（×）会请求 Runtime `setVisible(false)`，并受 `persistVisibility` 影响。

---

## 3. Music（`window.FWF_MUSIC`）

单文件入口或多组件（`orbit.js`）均在引入 JS 前设置：

```html
<script>
  window.FWF_MUSIC = {
    server: "netease",
    type: "playlist",
    id: "你的歌单ID"
  };
</script>
```

| 字段 | 说明 |
|------|------|
| `server` | 音源（Meting），默认 `netease` |
| `type` | `playlist` / `song` / `album` / `artist` |
| `id` | 歌单或歌曲等 ID（必填） |

本地会写入 `localStorage`（如 `mp-state-v3`：位置、音量、曲目等）。一般无需手改。

---

## 4. Clock

无独立全局配置对象。断点与手势写在 Host 内：

- 宽度 `≤ 600` 视为移动端
- 长按打开 Launcher 约 380ms（与 Runtime 一致）
- 位置：优先 `orbit-profile:clock`；旧键 `fwf-clock-pos-v1` 只读回退并一次性迁移

---

## 5. 环境要求

- 现代浏览器（Pointer Events、`localStorage`、`fetch`）
- 音乐播放依赖站点 HTTPS 与第三方音源 API 可用性

更多 API 见 [API.md](./API.md)；安全边界见 [SECURITY.md](./SECURITY.md)。
