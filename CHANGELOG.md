# Changelog

## 0.2.0-c — 2026-08-14

### Orbit Runtime

- 品牌名 **Orbit**；多 Widget 入口 `dist/orbit.js`
- `Orbit.mount` / `setVisible` / `list`
- Launcher 面板：桌面 `Alt+O`，移动端长按球
- 首次快捷键 / 长按提示（可关）
- Launcher 脚注：桌面 Alt+O / Esc，移动端长按与点遮罩
- 文档与 Demo 统一 Orbit 叙述（Phase D）

### Fixes

- Music `display:block !important` 下仍可隐藏
- 长按松手顺序：先识别长按再 endDrag（避免被当成点按）

## 0.1.0 — 2026-08-13

### Added

- Floating Widget Framework 预览：Shell 交互与 Widget 分离
- Music Widget、Clock Widget
- Interaction 模块、AudioEngine、WidgetRegistry
- `dist/` 单文件 + 静态 demo

