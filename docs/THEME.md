# 主题变量（Theme）

原则：**只改 CSS 变量与少量修饰类，不改状态机。**

---

## Music（`floating-widget-music.css`）

在站点自定义 CSS 中覆盖，例如：

```css
:root {
  --mp-size: 66px;
  --mp-width-open: 360px;
  --mp-list-h: 280px;
}
```

实际变量以 CSS 文件内定义为准（主题不同可能有 `--mp-*` 系列）。

常用思路：

| 目的 | 做法 |
|------|------|
| 球更大 | 增大 `--mp-size` / 球尺寸相关变量 |
| 展开更宽 | `--mp-width-open` |
| 毛玻璃 | `backdrop-filter` / 背景透明度（在对应选择器） |

---

## Clock（`floating-widget-clock.css`）

```css
.fwf-clock {
  --fwc-size: 72px;       /* 球直径 */
  --fwc-panel-w: 200px;   /* 展开宽度 */
  --fwc-blur: 16px;
  --fwc-bg: rgba(255, 255, 255, 0.55);
  --fwc-border: rgba(255, 255, 255, 0.45);
  --fwc-text: #0f172a;
  --fwc-shadow: 0 8px 32px rgba(15, 23, 42, 0.18);
}
```

暗色模式已用 `prefers-color-scheme: dark` 提供默认值，可再覆盖。

---

## 状态类（勿当主题入口乱删）

这些 class 由 Runtime 写入，主题可**配样式**，不要靠 JS 旁路增删：

| class | 含义 |
|-------|------|
| `is-open` | 展开 |
| `is-dragging` | 拖拽中 |
| `is-docked` / `dock-left` / `dock-right` | 贴边 |
| `is-snapping` | 吸附动画 |
| `expand-left` | 向左展开 |
| `is-magnet` | 磁吸预览 |

---

## 主题包建议结构（未来）

```text
theme-xxx/
  variables.css   ← 只含变量
  ornaments.css   ← 可选装饰
```

不包含 Interaction 与 Widget 业务逻辑。
