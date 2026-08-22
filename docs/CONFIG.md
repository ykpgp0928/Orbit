# 配置说明（Configuration）

## Music（`window.FWF_MUSIC`）

在引入 JS **之前**：

```html
<script>
  window.FWF_MUSIC = {
    server: "netease",
    type: "playlist",
    id: "你的歌单ID"
  };
</script>
<script src="/js/floating-widget-music.js" defer></script>
```

### Schema

```json
{
  "type": "object",
  "properties": {
    "server": { "type": "string", "default": "netease" },
    "type": {
      "type": "string",
      "enum": ["playlist", "song", "album", "artist"],
      "default": "playlist"
    },
    "id": { "type": "string" }
  },
  "required": ["id"]
}
```

### 本地持久化（自动）

Music 会把位置、音量、循环、当前曲目等写入 `localStorage`（键名如 `mp-state-v3`）。  
Clock 位置键：`fwf-clock-pos-v1`。

一般无需手动改。

## Clock

v0.1 无全局配置对象。行为写死在 Host：

- 断点：宽度 `≤ 600` 视为移动端  
- 长按阈值：约 380ms  
- 面板宽度：200px（CSS 变量可改）


## Notice（`window.ORBIT.notice`）

在引入 **orbit.js** 之前配置（与 `ORBIT.widgets` 同级字段 `notice`）：

```html
<script>
  window.ORBIT = {
    widgets: [{ id: "notice", visible: true }],
    notice: {
      title: "公告",
      text: "欢迎访问本站。",
      position: "top-right",  // 见下方预设
      offset: 20,             // 预设边距（px），可选
      // top: 16, right: 16,  // 或自定义边距（会覆盖预设对应边）
      // zIndex: 99989
    }
  };
</script>
```

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `title` | string | `"公告"` | 卡片标题（textContent，不解析 HTML） |
| `text` | string | 内置欢迎文案 | 正文；**配置优先于** profile 历史文本 |
| `position` | string | `"top-right"` | 预设：`top-left` / `top-right` / `top-center` / `bottom-left` / `bottom-right` / `bottom-center` |
| `offset` | number \| string | `20` | 预设四角/顶底边距（number 为 px） |
| `top` / `right` / `bottom` / `left` | number \| string | — | 自定义边距；写出的边覆盖预设，并对轴另一侧设为 `auto` |
| `zIndex` | number \| string | `99989` | 层叠顺序 |

公告须在 `ORBIT.widgets` 中显式加入 `{ id: "notice", visible: true }` 才会挂载。位置仅由站长配置决定，不写入用户 Profile。

## 环境要求

- 现代浏览器（需 `Pointer Events`、`localStorage`、`fetch`）  
- 播放能力依赖目标站点 HTTPS 与音源 API 可用性  


## Orbit（`window.ORBIT`）

在引入 **orbit.js** 之前：

```html
<script>
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

| 字段 | 默认 | 说明 |
|------|------|------|
| `launcherKey` | `Alt+O` | 桌面打开管理面板 |
| `launcherHint` | `true` | 首次 ≥2 组件时右下角提示 |
| `widgets` | 全部已注册宿主 | `visible: false` 则先不显示 |
| `launcherFallback` | `ghost` | `ghost`：粗指针且全部隐藏时显示恢复按钮；`host-button` / `none` |
| `launcherShowAll` | `false` | `true` 时 Launcher 列出全部已注册 Widget；默认只列出 `widgets` 中声明的项 |

手机：**长按**球打开同一面板（与桌面快捷键等价入口）。

关闭首次提示记录：

```js
localStorage.removeItem("orbit-launcher-hint-v1")
```
