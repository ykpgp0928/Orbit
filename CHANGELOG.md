# Changelog

## 0.1.0 — 2026-08-13

### Added

- Floating Widget Framework 预览：Shell 交互与 Widget 分离  
- **Music Widget**：歌单、播放、Dock、移动端卡片、桌面展开  
- **Clock Widget**：时间显示、桌面悬停 / 移动端点按、右吸附向左展开  
- Interaction 模块：Gesture、Drag、Snap、Dock、Layout  
- AudioEngine、WidgetRegistry  
- `dist/` 单文件产物 + `npm run build`  
- 文档：API、CONFIG、THEME、各 Phase 记录  
- 静态 `demo/index.html`（无需 Hexo）

### Notes

- Hexo 使用方式：拷贝 `dist` 中对应 js/css 并 inject  
- `window.FWF_MUSIC` 可覆盖歌单配置  
