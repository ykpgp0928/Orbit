# Changelog

## 0.3.0 — 2026-08-15

### Runtime

- Widget 契约与 LifecycleScope（cleanup 逆序 / 幂等 / 异常隔离）
- `Orbit.destroy(id)` 与 `setVisible` 分离（隐藏 ≠ 销毁）
- `mount` 幂等；`widgets` 省略已挂载 id 不会销毁该实例
- Host adapter：`destroy`、`getVisibilityTargets`
- Clock / Music 可 destroy 后再挂载

### Launcher & 移动端

- 焦点：打开聚焦、Tab 循环、关闭恢复
- `launcherFallback: 'ghost'`（默认）：粗指针且全部隐藏时 ◎ 恢复入口
- Widget / ◎ 显隐过渡动画

### 质量

- `npm run test:unit` / `npm run ci` / `check:dist`
- ExpandPolicy、LifecycleScope、Registry 单测
- GitHub Actions CI
- `docs/PERFORMANCE.md`（拖拽 rAF 合并等）

### 文档

- `docs/v0.3-iteration.md`、各 Phase 记录、`MIGRATION-v0.3.md`、`DEVELOPMENT.md`

## 0.2.0 — 2026-08-14

### Orbit Runtime

- 品牌 **Orbit**；`dist/orbit.js` 多 Widget
- Launcher：桌面 Alt+O，移动端长按球
- 首次提示；面板脚注随设备变化

### Fixes

- Music 可被隐藏；长按不再误判为点按
- 移动卡片左右展开与视口内平移

## 0.1.0 — 2026-08-13

### Added

- FWF 预览、Music / Clock、Interaction、dist 成品与 demo
