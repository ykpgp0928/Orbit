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

## 环境要求

- 现代浏览器（需 `Pointer Events`、`localStorage`、`fetch`）  
- 播放能力依赖目标站点 HTTPS 与音源 API 可用性  
