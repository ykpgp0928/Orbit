# Phase 6 — 硬化与发布准备

**Status:** ✅ 文档与 demo 就绪（npm 正式上架可按需进行）

## 交付物

| 项 | 路径 |
|----|------|
| 公开 API | `docs/API.md` |
| 配置 | `docs/CONFIG.md` |
| 主题变量 | `docs/THEME.md` |
| 变更记录 | `CHANGELOG.md` |
| 无 Hexo Demo | `demo/index.html` |
| 成品 | `dist/*` |
| 构建 | `npm run build` |

## 版本

- **0.1.0** — 首个可交付预览：Music + Clock 双 Widget，Hexo 单文件接入

## 包名规划（未强制发布）

| 包名（规划） | 内容 |
|--------------|------|
| `@floating-widget/core` | Interaction + Shell primitives |
| `@floating-widget/music` | Music Widget + AudioEngine |
| `@floating-widget/clock` | Clock Widget |

当前仓库以 **monorepo 源码 + dist 单文件** 交付，适合主题作者直接拷贝。

## 验收

- [x] 无 Hexo 静态页可同时或分别演示 Widget  
- [x] 配置 / API / 主题有独立文档  
- [x] `npm run build` 产出 music + clock  
- [x] 交互资产（拖拽、吸附、左右展开、桌面/移动分流）已在 Phase 5 验收  
