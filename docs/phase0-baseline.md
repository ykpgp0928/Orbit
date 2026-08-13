# Phase 0 — Interaction Baseline Freeze

> Tag: `interaction-baseline-v1`  
> Date: 2026-08-12  
> Source snapshot: `baseline/music-player.js` + `baseline/music-player.css`

本阶段目标：**冻结已被用户体验验证的悬浮播放器行为**，作为后续所有重构的不可破坏基线。  
任何 Phase 的合并条件：本检查表全绿。

---

## 1. 产品与演进定位（冻结意图）

- 当前交付物是一个已验证的悬浮音乐播放器。
- 下一阶段目标是成长为 **Web Floating Widget Framework (FWF)**。
- 音乐播放降级为官方示例 Widget。
- Runtime 只管理：Position / State / Interaction / Lifecycle。
- 必须保护的交互资产属于 Runtime，不属于 Music 业务。

### 主 Mode（后续 Phase 1 落地，此处仅冻结设计意图）

```text
BALL | PANEL | DOCK
```

- 移动端大卡片 = `mode: PANEL` + 移动端 layout/presentation（不是新 Mode）。
- 底部歌单抽屉 = `slot:sheet` 显隐，由 Widget / Dock 子状态控制。
- `dock.expanded` 仅为 DOCK 子状态。
- `expandLeft` 归入 layout 修饰，仅在 PANEL 时有效。

---

## 2. 关键常量与经验值（手感基线）

迁移时只允许集中到配置文件，**默认值必须与下表一致**，不得静默改变导致手感漂移。

| 类别 | 值 | 来源 / 说明 |
|------|-----|-------------|
| 球尺寸（桌面） | 66px | `CONFIG.ballSize` / `--mp-size` |
| 球尺寸（移动） | 52px | `CONFIG.ballSizeMobile` / `--mp-size-sm` |
| 长按触发 | 380ms | `CONFIG.longPressMs` |
| 点击判定阈值 | 12px | `CONFIG.clickThreshold` |
| 磁吸进入（桌面） | 40px | `CONFIG.snapThreshold` |
| 磁吸释放（桌面） | 36px | `CONFIG.snapRelease` |
| 磁吸进入（移动） | 28px | `CONFIG.snapThresholdMobile` |
| 磁吸释放（移动） | 28px | `CONFIG.snapReleaseMobile` |
| 鬼点击保护窗口 | 450–1000ms | `ignoreBallToggleUntil` 系列逻辑 |
| Dock 关闭动画锁 | ~320ms | `is-dock-closing` 定时器 |
| 列表关闭动画 | ~420ms | `is-list-closing` |
| 桌面展开宽度 | 360px | `--mp-width-open` |
| 移动端卡片宽度 | min(72vw, 260px) | 移动端覆盖 |
| 移动端卡片高度上限 | min(34vh, 210px) | 移动端覆盖 |
| 存储 key | `mp-state-v3` | 位置、音量、循环、索引、时间 |
| 边缘基础偏移 | left:20px / bottom:20px（移动 16px） | 根节点定位 |

---

## 3. 当前 DOM / Class 契约

后续 Renderer 必须继续支持这些类名的语义（可增不可随意删除语义）。

### 根节点状态类

- `is-open`
- `is-docked` / `dock-left` / `dock-right`
- `is-dragging` / `is-snapping`
- `is-dock-closing`
- `expand-left`
- `is-list-open` / `is-list-closing` / `list-up`
- `dock-list-open` / `dock-down`
- `is-playing`
- `is-mobile`
- `no-hover-expand`
- `is-magnet` / `magnet-left` / `magnet-right`

### 结构 → 未来 Slot 映射

| 现有选择器 | 未来 Slot | 说明 |
|------------|-----------|------|
| `#music-player` | `fw-root` | 悬浮根 |
| `.mp-cover` | `slot:cover` | 拖拽手柄 + 封面 |
| `.mp-body` | `slot:panel` | 展开主内容区 |
| `.mp-dock-btns` | `slot:dock` | 贴边功能球 |
| `#mp-list` / `#mp-dock-list` | `slot:sheet` | 歌单（普通 + 底部抽屉） |

Phase 0 **不改名**，只记录映射，供 Phase 2 Template 化使用。

---

## 4. 交互检查表（Interaction Checklist）

测试环境要求：
- 桌面：支持真实 hover 的浏览器（Chrome / Firefox / Safari）
- 移动：真实手机或可靠触控模拟 + 宽度 ≤ 600px

每条必须通过，否则禁止进入 Phase 1。

### A. 桌面（hover: hover + pointer: fine）

| # | 场景 | 期望行为 | 通过 |
|---|------|----------|------|
| A1 | 球静止，鼠标悬停 | 展开控制栏，宽度与圆角过渡正常 | ☐ |
| A2 | 悬停后移出 | 自动收起为球，无残留展开态 | ☐ |
| A3 | 拖拽过程中 | 强制收为球，控制栏与列表立即隐藏，阴影变浅 | ☐ |
| A4 | 拖到左/右边缘附近 | 出现磁吸，松手后吸附并进入 Dock | ☐ |
| A5 | Dock 态悬停 | 保持球尺寸，内侧弹出功能球（错位 scale 动画） | ☐ |
| A6 | Dock 态移出 | 功能球收起，球本身不位移 | ☐ |
| A7 | 靠近右边缘展开 | 自动 `expand-left`，球位置不跳 | ☐ |
| A8 | 点击封面（非拖拽） | 播放/暂停切换，封面旋转状态同步 | ☐ |
| A9 | 打开普通歌单 | 列表从控制栏下方或上方（list-up）展开，动画完整 | ☐ |
| A10 | 拖拽结束后再次悬停 | `no-hover-expand` 解除前不误展开（需移出再进入） | ☐ |

### B. 移动端（宽度 ≤ 600px 或触控）

| # | 场景 | 期望行为 | 通过 |
|---|------|----------|------|
| B1 | 短按球（非吸附） | 打开移动端竖向卡片，不是桌面横条 | ☐ |
| B2 | 再次短按或点击外部 | 收起为球 | ☐ |
| B3 | 长按球 | 进入拖拽，收起任何展开态 | ☐ |
| B4 | 拖到边缘松手 | 吸附并进入 Dock，球不飞出屏幕 | ☐ |
| B5 | Dock 态短按 | 只切换功能球展开/收起，**不**变成大卡片 | ☐ |
| B6 | Dock 关闭后立即再点 | 保护窗口内不出现「关了又立刻开」 | ☐ |
| B7 | 打开歌单 | 底部 Sheet 从下往上滑出（全宽、顶部圆角、拖条） | ☐ |
| B8 | 点选歌曲后 | 移动端自动收起 Sheet | ☐ |
| B9 | 展开卡片时靠近边缘 | 位置被补偿，卡片不大幅超出视口 | ☐ |
| B10 | 旋转屏幕 / resize | 位置被 clamp，不卡在屏幕外 | ☐ |

### C. Dock 与模式切换通用

| # | 场景 | 期望行为 | 通过 |
|---|------|----------|------|
| C1 | 吸附后拖离边缘 | 退出 Dock，恢复自由球 | ☐ |
| C2 | Dock 功能球点击 | 播放 / 上一首 / 下一首 / 循环 / 歌单均正常 | ☐ |
| C3 | 关闭 Dock 动画期间 | 忽略新的 toggle，动画结束后才接受输入 | ☐ |
| C4 | 列表打开时开始拖拽 | 立即关闭列表并收为球 | ☐ |
| C5 | 深色 / 浅色主题切换 | 玻璃、文字、强调色跟随变量，无错乱 | ☐ |

### D. 持久化与环境

| # | 场景 | 期望行为 | 通过 |
|---|------|----------|------|
| D1 | 刷新页面 | 位置、当前曲、循环模式、音量、进度恢复 | ☐ |
| D2 | Pjax 完成后 | 播放器重新出现且位置正确（或可重新挂载） | ☐ |
| D3 | 播放结束 | 按循环模式正确切歌或停止 | ☐ |
| D4 | API 失败 | 显示失败提示，不白屏、不抛未捕获错误 | ☐ |

### E. 视觉与动画节奏（定性）

| # | 检查项 | 期望 | 通过 |
|---|--------|------|------|
| E1 | 展开/收起宽度与圆角 | 使用现有 cubic-bezier，无生硬跳变 | ☐ |
| E2 | 封面旋转 | 仅在 playing 且非 dragging 时运行 | ☐ |
| E3 | Dock 功能球 | 错位 scale 弹出，关闭时有收起 | ☐ |
| E4 | 移动端 Sheet | 从底部滑入/滑出，节奏与现网一致 | ☐ |

---

## 5. Phase 0 完成标准

全部满足后方可进入 Phase 1：

1. 检查表在桌面 + 移动端至少各完整跑一遍，全部勾选。
2. `baseline/music-player.js` 与 `baseline/music-player.css` 已作为快照保存。
3. 本文件（`docs/phase0-baseline.md`）已纳入版本管理。
4. 确认后续任何改动若导致检查表失败，必须回滚或修复后才能继续。

---

## 6. 下一步（Phase 1 预告）

Phase 1 目标：

- 引入轻量 `State` + `normalize`
- 新增 `Renderer.sync(state)` 作为唯一 class 写入口
- 现有业务逻辑仍运行，但所有 `classList` 逐步改走 `patch → sync`
- **不改 CSS 曲线与结构选择器**
- 默认常量与上表保持一致

完成 Phase 0 检查表后，即可开始 Phase 1。

---

## 7. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-08-12 | Phase 0 文档与 baseline 快照创建 |
