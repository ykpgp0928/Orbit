# Changelog

## 0.4.0 — 2026-08-16（发布准备完成）

> **Orbit v0.4.0 — Runtime Hardening & Contract Alpha**
> 面向静态站悬浮交互 Runtime 的架构发布：实验性 Widget Contract、local-first Profile、完整生命周期回归。Contract 尚未冻结为 1.0 API。

### 新增能力

- **Widget Contract Alpha**：`Orbit.register(definition)` 桥接 Runtime 实例管理；ctx 服务：`lifecycle` / `visibility` / `profile` / `portal` / `launcher` / `instance`（M2）
- **第三 Widget：Notice 公告**：可折叠、关闭记忆持久化、自定义标题/文本（配置优先）
- **Profile Alpha**：`Orbit.exportProfile()` / `Orbit.importProfile()`（schema 校验、单项损坏容错、未知 Widget 数据保留）
- **可见性持久化**：`orbit-visible-v1`（Launcher 开关 / 公告关闭跨刷新保持；`ORBIT.persistVisibility: false` 可禁用）
- **PJAX / body 替换统一恢复**（Runtime 级，含 claimed portal 重挂）
- **质量门禁**：`npm run verify` 单入口（build + unit + 127 项 DOM 断言 + dist/links/version/pack 检查）；`check:pack` 保证发布包含 Contract/Profile/Security/示例

### 破坏性影响

- **Notice 不再自动挂载**：必须列入 `ORBIT.widgets`（`defaultVisible: false`）
- **公告 × 关闭现在持久化**（刷新后保持关闭，可从 Launcher 重新开启）；旧 `respectDismiss` 配置移除
- **Clock 位置存储迁移**：`fwf-clock-pos-v1` → `orbit-profile:clock`（自动一次性迁移，旧 key 作回退）
- `registerWidget` id 必须匹配 `^[a-z0-9][a-z0-9._-]*$`

### 已知限制

- Contract 为 `0.4 experimental`：v0.5 允许一次受控破坏性调整；`layout`/`gesture`/`dock`/`drag` 服务未公开
- Music 仍是**最小适配层**（业务 shell 未拆解，拆解列 v0.5）
- Profile 仅本地存储、无同步；schema `orbit-profile/0.4`，未知 schema 拒绝导入
- Music 音源依赖第三方 Meting API（失效时显示"加载失败"，不影响其他 Widget）
- Launcher 中未挂载的 Widget 开关显示「关」，点开即挂载

### 升级动作

- 主题维护者：`ORBIT.widgets` 加入 `{ id: "notice", visible: true }`（可选）；需要公告时引入 `floating-widget-notice.css`；`window.ORBIT.notice = { title, text }` 自定义内容
- 0.2/0.3 用户：配置不变即可升级；隐藏 ≠ 销毁、`destroy(id, { forget: true })` 语义见 `docs/MIGRATION-v0.3.md` 与 `docs/API.md`
- 部署者：阅读 `docs/SECURITY.md`（CSP / 外部音源 / 动态文本边界）
- 发布检查：`docs/RELEASE-CHECKLIST.md`（真机矩阵 + 仓库动作）

### 开发记录

### M4：Profile Alpha 与可移植性（完成）

- **`Orbit.exportProfile()`**：聚合本地数据为 `orbit-profile/0.4` envelope——schema / exportedAt / runtime（launcherKey + 可见性偏好）/ widgets（各 `orbit-profile:<id>` 命名空间 + Music legacy `mp-state-v3` 作为 `widgets.music.state`）
- **`Orbit.importProfile(objOrJson)`**：schema 严格校验（`invalid-json` / `not-an-object` / `unsupported-schema` 清晰拒绝）；可见性**合并**导入（不删本地其他偏好）；**单项损坏容错**（非对象条目跳过，不阻断其他）；未知 Widget 数据原样保留（注册后即可用）；`profileImport` 事件
- **文档**：`docs/PROFILE.md`（数据位置、导出/导入/清除、schema 演进、隐私承诺：数据只留本地、导出由用户主动触发、零上传）；PROFILE.md 纳入 npm 发布包与 check-pack
- **测试**：contract.test.mjs [8] 14 项断言——导出内容完整性、导入回写（可见性/Widget profile/Music legacy）、坏 JSON 与未知 schema 拒绝、损坏条目容错、未知 Widget 保留、非布尔可见性忽略

### 半程评估收口批次 A/B（2026-08-21，对照《Orbit v0.4 半程评估》）

- **P1-3 修复（假 started）**：`ensureStarted` 改为只在 adapter 实际挂载成功（`start() !== false`）时标记 `started`；mount 抛错时实例保持未启动、Launcher 显示关、下次 `setVisible` 自动重试
- **P1-5 修复（默认值一致）**：adapter 支持 `defaultVisible`（默认 true）；Notice 声明 `defaultVisible: false`——未配置 `ORBIT.widgets` 时不再自动挂载，与 README 文档一致
- **P1-4 修复（destroy 语义）**：`Orbit.destroy(id, { forget: true })` 清除该 widget 的持久化可见性偏好（默认保留——destroy 是程序操作，不是用户偏好）
- **P1-1 修复（fetch 取消）**：Music `fetchPlaylist` 支持 `AbortController`，destroy 时 abort；init 的 fetch 回调与 catch 增加 `alive` 守卫——销毁后请求结算不再 renderList/loadSong/创建音频
- **P1-2 修复（拖拽中销毁）**：Music/Clock 的 destroy 终止进行中的 pointer 会话（gesture.cancel、释放 pointer capture、移除 document pointermove/up/cancel 监听）
- **P2-1 修复（portal 恢复）**：Runtime body-recovery 恢复 root 的同时重挂 claimed portal；Music `root`/`portals()` 改用内存引用（body 替换后实时查询会丢引用）
- **P2-2 修复（Contract 字段）**：Registry 保留 `capabilities`；CONTRACT-ALPHA 字段表与实现对齐（id/mount 必填，version/label/capabilities 推荐）
- **P1-6 修复（发布包）**：`package.json.files` 纳入 `examples/`、`docs/CONTRACT-ALPHA.md`、`docs/MIGRATION-v0.3.md`；新增 `scripts/check-pack.mjs` 并接入 `npm run verify`
- **新增回归**：fetch 进行中 destroy（无音频复活）、拖拽中 destroy（document 监听净零）、mount 抛错（不假 started、重复 setVisible 不伪装）、无配置页 notice 不自动挂载、PJAX 后 portal 恢复

### M3：Clock 与第三异质 Host 迁移；Music 最小适配层（完成）

- **新能力（可见性持久化）**：widget 开/关状态写入 `localStorage["orbit-visible-v1"]`（`ORBIT.persistVisibility: false` 可禁用）；用户偏好（Launcher 开关、公告关闭）优先于 `ORBIT.widgets` 默认值，刷新后保持
- **新能力（公告 × 同步 Launcher）**：关闭公告即调用 Runtime `setVisible(false)`（新增 `ctx.instance` 服务），Launcher 开关同步拨到「关」并持久化；移除旧 `respectDismiss` 机制（被更强的偏好持久化取代）

- **修复（公告关闭按钮无效）**：`orbit-hidden` 显隐样式原由 Launcher 面板样式注入，未打开过 Launcher 时样式不存在 → 点 × 无视觉效果。现提升为 Runtime 层 `ensureRuntimeStyles()`（mount 即注入 `#orbit-runtime-style`），关闭立即生效（computed style 断言覆盖）
- **修复（公告内容无法自定义）**：文本读取原为 profile 优先 → 点过关闭后旧文本卡住配置。改为**配置优先**（`window.ORBIT.notice.text` 总是生效），并新增 `title` 自定义标题（textContent 渲染，杜绝注入）

- **修复（公告"不显示"）**：Launcher 面板状态不诚实——`state[id] !== false` 会让「已注册但未挂载」的 widget（未列入 `ORBIT.widgets`）显示为「开启」，导致公告看起来"开了却不显示"。改为 `state[id] === true`：未挂载的 widget 显示「关」，点开即挂载；启用公告需在 `ORBIT.widgets` 显式加入 `{ id: "notice", visible: true }`（README 已醒目说明）
- **加固（恢复观察器）**：`ensureBodyRecovery` 改绑 `document.documentElement`（subtree），覆盖 PJAX 主题整体替换 `<body>` 元素的场景（原绑定 body 会随旧 body 一起失效）

- **修复（PJAX / 主题 body 替换恢复）**：此前只有 Music 有 `pjax:complete` + observer 复活机制，Clock / Notice 在 PJAX 导航（Hexo 常见）后 root 被摘除且不恢复——表现为「点击进入公告不显示、重启才出现」。新增 **Runtime 级统一恢复**（`Orbit.js` `ensureBodyRecovery`）：MutationObserver 监控 body，任何 started 且未 destroy 的实例 root 丢失即重新挂回（隐藏状态随 classList 保留、destroy 后永不复活）；所有 Contract Widget 自动受益，无需各自实现
- **修复（dismiss 语义）**：Notice 默认每次加载显示——点 × 只隐藏当前实例，不再因历史 `dismissed` 记录导致后续加载默认隐藏；需要「永久关闭」可配置 `window.ORBIT.notice = { respectDismiss: true }`（关闭记忆仍经 `ctx.profile` 持久化）

- **Clock 迁移为 Contract Widget**（`src/host/clock-host.js`）：导出 `clockWidgetDefinition`，`mount(ctx)` 使用 `ctx.lifecycle`（scope 由 Runtime 提供）、位置持久化改用 `ctx.profile`（旧 localStorage key 一次性迁移回退）；独立单文件模式经 `createStandaloneCtx()` 保持 `floating-widget-clock.js` 行为不变
- **第三异质 Host：Notice 公告**（`src/widgets/notice/NoticeWidget.js` + `notice.css`）：可折叠站点公告卡，验证 Contract 不绑定音频/时间业务域；关闭记忆走 `ctx.profile`（dismissed 持久化，重挂载默认隐藏、Launcher 显式打开可恢复）；`window.ORBIT.notice.text` 可配公告文本；产物 `dist/floating-widget-notice.css`
- **Music 最小适配层**（`src/host/music-player-host.js`）：`musicWidgetDefinition` 包装 start/destroy + `portals()`（data-orbit-portal 查询）；业务 shell 原状保留，全量 Contract 拆解列 v0.5
- **统一注册**：`entry-orbit.js` 三个 Widget 全部走 `Orbit.register()`，删除 `registerHost` 生产路径；Runtime 零硬编码 widget id（Launcher 元数据驱动 M2 已完成）
- **Orbit.js**：Contract adapter 的 `getVisibilityTargets` 支持 `WidgetInstance.portals()`（Host 自行上报 body 级节点）
- **测试**：新增 `tests/three-widget.test.mjs` + `tests/m3-test.html`（三 Widget 并存与隔离：destroy/hide 任一不影响其他、Launcher 三行元数据 label、notice dismiss→profile→remount 恢复、监听计数恒定）；`lifecycle.test.mjs` 增加独立入口回归（`test-clock.html` + `__FWF_CLOCK__` start/destroy/restart）；`npm run test:dom` 三套件（59 + 21 + 14 = 94 断言）
- **构建**：`build.mjs` orbit target 附带 notice.css → `dist/floating-widget-notice.css`；`check-dist-sync` required 列表同步

### M2：Contract Alpha 步行骨架（完成）

- **Contract 桥接**（`src/core/Orbit.js`）：`Orbit.register(def)` 现在同时注册定义并桥接到 HostAdapter 实例路径——Contract Widget 获得与第一方 Host 相同的 start/getRoot/destroy/visibility/Launcher 管理，无需复制 Runtime 内部知识
- **ctx 5 类核心服务**：`lifecycle`（LifecycleScope 包装）、`visibility`（通用显隐原语 `setElementVisible`，从 applyDomVisibility 抽出）、`profile`（按 widget id 命名空间 `orbit-profile:<id>` 的本地 JSON 存储）、`portal`（claim/release/list，destroy 时 Runtime 负责拆除）、`launcher`（open/close/toggle）
- **Launcher 元数据驱动**：移除 `LABELS` 硬编码，标签来自 `Orbit.getLabel(id)`（Contract 定义 → adapter label → id）；**所有插入 HTML 的 label/id 均转义**（XSS 防护，含恶意 label 断言）
- **入口 boot 时序修复**：defer 脚本执行时 readyState 为 interactive，原逻辑立即 boot 导致后注册的 Contract Widget 错过挂载；现统一等 DOMContentLoaded（`loading` 或 `interactive`）
- **校验**：`registerWidget` id 强制 `^[a-z0-9][a-z0-9._-]*$`；mount 必须返回带 `destroy()` 的 WidgetInstance，错误经 `widgetError` 事件上报
- **Reference Widget**：`examples/reference-widget/badge.js` + `badge.css`——外部作者视角（仅公开 API、无内部 import、无 window/document 全局监听、不写 Orbit 私有 class），走通 register→mount→profile→portal→launcher→setVisible→destroy→remount
- **接入指南**：`docs/CONTRACT-ALPHA.md`（Widget 作者向：定义/实例/服务/语义/限制）
- **测试**：`tests/contract.test.mjs` + `tests/contract-test.html`（空静态页接入）；共用 `tests/_helpers.mjs`；`npm run test:dom` 现含两套 DOM 测试（lifecycle 56 + contract 21）

### M1：Lifecycle Hardening（完成）

- **前置清理**：删除未被生产路径引用的 `src/widgets/music/MusicWidget.js` 与 `PlaylistSource.js`（与 host 内联逻辑的 parity 双实现）
- **DOM 集成测试基建**：新增 `tests/lifecycle.test.mjs`（Playwright + 系统 Edge/Chrome，零下载）；`npm run test:dom`
  - 在页面脚本前 instrument `addEventListener/removeEventListener/Audio`，量化 document/window 监听净计数与音频实例
  - 断言：music/clock 各自 mount→destroy→mount ×3 后监听计数不增长、portal 移除、无 detached root、单次 pointer 会话只产生一次业务反应
  - 修复前红（每轮 remount docNet +2 / winNet +2、全局 flag 残留），修复后 **56 项断言全绿**
- **Music Host 生命周期收口**（`src/host/music-player-host.js`）：
  - `bindEvents` 全部监听具名化并注册进 LifecycleScope，destroy 时逆序释放（原 13 处匿名监听不可清理）
  - 移除 `window.__mpGhostClickBlocker` 全局 flag → 模块级 `ghostClickBlockerBound`，destroy 复位
  - destroy 清理 `moveRaf`/`pendingMove`/`longPressTimer`/`ignoreBallToggleUntil`/`bootTimer`，复位惰性单例（snap/dock/layout/gesture/drag）与 shell 状态
  - 异步恢复路径加 `alive` 守卫：`bootTimer` 可取消、bodyObserver/PJAX 回调不再复活已销毁实例、seek 恢复监听具名化并入 lifecycle、rAF fix 防操作已销毁 root
- **质量门禁**：`npm run verify` 纳入 `test:dom`；CI 增加 Playwright Chromium 安装步骤（`npx playwright-core install --with-deps chromium`）

### M0：基线冻结与版本契约

- 版本单一来源：新增 `src/core/version.js`，`Orbit.version` 改从该模块读取；package.json / README / API.md / demo 文案统一为 0.4.0
- 新增 `scripts/check-version.mjs`（package ↔ version.js ↔ dist ↔ 文档一致性门禁）
- 新增 `scripts/check-links.mjs`（README / CHANGELOG / docs 相对链接检查）
- 修复死链：创建 `docs/MIGRATION-v0.3.md`（README / CHANGELOG 原引用缺失文件）
- CI 收敛：`.github/workflows/ci.yml` 只调用 `npm run verify`（build + test 含 normalize + check:dist + check:links + check:version），与本地完全一致
- 重新生成 `site/`（`npm run prepare-site`），消除 site/dist 漂移

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

- `docs/history/v0.3-iteration.md`、各 Phase 记录、`MIGRATION-v0.3.md`、`DEVELOPMENT.md`

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
