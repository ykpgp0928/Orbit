# Orbit v0.4 方案：从高质量实现到可依赖的悬浮交互 Runtime（修订版 v2）

**版本定位：** `v0.4.0 — Runtime Hardening & Contract Alpha`  
**方案日期：** 2026-08-16（v1）· **修订：** 2026-08-16（v2，基于代码审查与 M0 执行）  
**适用基线：** Orbit v0.3.0 → v0.4.0 开发基线（M0 已执行）  
**作者：** Manus AI（v2 修订：审查反馈）

## 修订记录（v2 变更摘要）

| # | v1 原文 | v2 决定 | 原因 |
|---|---|---|---|
| 1 | Milestone 3 迁移「两个第一方 Host + 第三种异质 Host」 | **Music 仅做生命周期/资源收口，业务全量拆解后置 v0.5**；M3 只迁移 Clock + 第三异质 Host | 1566 行 Music 单体与 shell 状态投影深度纠缠，全量迁移会拖死整版；v1 自己也允许「不要求一次拆完」 |
| 2 | `ctx` 提供 8 类服务（lifecycle/visibility/layout/gesture/profile/portal/events/a11y） | **Contract Alpha 只固定 5 类核心横切服务**：`lifecycle`、`visibility`、`profile`、`portal`、`launcher`；layout/gesture/events/a11y 为可选注入 | 8 服务会让第三个 Widget 被迫理解太多布局细节，重蹈 Music 复杂度覆辙（v1 风险章节自认的最大风险） |
| 3 | 测试矩阵泛称「DOM integration」 | **明确选型 Playwright**，用例数限制在 3–5 条；jsdom 无法验证布局/手势，不采用 | 避免测试基建本身成为新负担 |
| 4 | DoD 六项 | **收敛为五项**（删除「三 Widget 均用同一套 API 全迁移」表述，改为 Music 生命周期闭合 + Clock/第三 Host 以 Contract 接入） | 与 #1 配套 |
| 5 | 未提及 Music 双实现 | **新增 Milestone 1 前置清理**：`src/widgets/music/MusicWidget.js` + `PlaylistSource.js` 未被任何生产入口引用，与 host 内联逻辑「parity」双份并存 | 审查实测发现；不清理则 Contract 迁移时还要先判断哪份是真相 |
| 6 | 北极星靠内部作者自证 | **新增外部试点要求**：至少 1 个非仓库作者的静态站试用并记录接入过程 | 「官方示例伪装成生态」风险需要外部验证才能破 |
| 7 | 未提 Music 音源依赖 | **风险章节补充 Meting 第三方 API 依赖**（`api.injahow.cn` 等三个源经常失效） | 审查实测：演示价值受外部 API 生死影响，v0.4 不解决但必须记录 |
| 8 | Milestone 0 未定义具体执行清单 | **M0 已执行**（见 §五.0）：版本单一来源、verify 收敛、死链修复、site 同步 | 本次审查后直接落地 |

---

## 零、现状核实（2026-08-16 代码审查结论）

v1 引用的现状判断经逐条代码核实，**全部属实**，并补充了三项 v1 未记录的事实：

| v1 引用 | 核实结果 | 代码证据 |
|---|---|---|
| Music 生命周期资源未完全收束 | ✅ 属实且更严重：`createLifecycleScope` 创建/销毁但 **`lifecycle.add` 从未被调用**（装饰性 scope）；`bindEvents` 的 document/window 级匿名监听器（2× `pointerdown`、`resize`、`beforeunload`、ghost-click blocker + 全局 flag `window.__mpGhostClickBlocker`）在 `destroy` 后全部残留，**反复 mount/destroy 会真实累积** | `src/host/music-player-host.js` L1293–1383、L1535 |
| CI 只跑 `test:unit`，漏 normalize | ✅ 属实：`ci.yml` 无 `test:normalize`；本地 `npm test` 与 CI 集合不一致 | `.github/workflows/ci.yml`、`package.json` |
| 版本口径 0.3.0/Phase 4/Phase 5 并存 | ✅ 属实：package.json `0.3.0` / Orbit.js `0.3.0-phase5` / API.md「v0.3 Phase 4」/ phase4 文档 `0.3.0-phase4` | 四处字符串比对 |
| README 死链 | ✅ 属实：README/CHANGELOG 均链接不存在的 `docs/MIGRATION-v0.3.md` | `Test-Path` 为 False |
| Launcher 只依赖 Contract 元数据 | ❌ 未达成：`LABELS = { music, clock }` 硬编码 | `src/core/Launcher.js` L6–9 |
| `registerWidget`/Registry 未闭环 | ✅ 属实：生产路径全走 `registerHost`；`mountWidget` 无人调用 | `src/entry-orbit.js`、`src/core/WidgetRegistry.js` |
| **（新增）** Music 双实现并存 | ✅ `src/widgets/music/MusicWidget.js` + `PlaylistSource.js` **未被任何生产入口引用**，host 用「parity with」注释内联了同样的 fetch/渲染逻辑 | grep `MusicWidget\|PlaylistSource` 仅注释命中 |
| **（新增）** 产物与站点漂移 | ✅ `site/dist` 三个 JS 与 `dist/` 不同步（需 `prepare-site`） | `check:dist` WARN |
| **（新增）** Music 依赖第三方音源 API | ✅ 三个 Meting 兼容源均为公共免费 API | `music-player-host.js` L17–21 |

---

## 一、版本命题

Orbit v0.4 不应被定义为“增加几个新的悬浮组件”，也不应把 Music、Clock 或任何未来 Widget 当作产品本体。其唯一版本命题应当是：**使 Orbit 成为第三方功能可以安全依赖的、面向静态站的悬浮交互 Runtime。**

> **v0.4 的完成不是“新增功能已经演示”，而是“外部开发者可以用稳定、可测试、低样板的契约，把一个新 Widget 接入另一个采用 Orbit 的静态站主题”。**

v2 在此命题上增加一条纪律：**契约不是内部代码的重新包装**。三个 Widget 可以由核心仓库维护，但至少一个必须按外部作者文档、独立目录、仅公开 API 的方式实现，且至少一个真实外部站点完成接入试点。

## 二、必须解决的产品问题

| 当前状态 | 为什么仍可替代 | v0.4 要改变什么 |
|---|---|---|
| Music 与 Clock 是首批内置 Host | 用户可只取 UI 成果，而不采用 Orbit。 | 把 Host 私有能力抽成所有 Widget 可用的 Runtime Services。 |
| `registerHost` 是实际生产路径 | 扩展能力仍是内部适配器约定。 | 推出可文档化、可测试的 `Orbit Widget Contract Alpha`。 |
| `registerWidget`/Registry 与实际挂载未闭环 | 架构概念尚未成为真正插件路径。 | 让 Contract 定义可注册、可挂载、可显隐、可销毁。 |
| 用户状态只分散在各 Host 的 localStorage | 不存在跨 Host、跨主题的连续性。 | 定义本地优先、可导入导出的 `Orbit Profile` 格式。 |
| 生命周期在 Clock 与 Music 上不一致 | 第三方作者无法信赖 destroy/remount。 | 将资源所有权和清理作为发布阻断条件。 |

## 三、v0.4 的边界：做什么与不做什么

| v0.4 必做 | v0.4 不做 |
|---|---|
| **完整加固 Music 与 Clock 的 mount/destroy/remount 生命周期（Music 只收口，不拆业务）** | 不引入账户体系、云同步、付费服务或中心化 Widget 市场。 |
| 发布 Widget Contract Alpha 和 Runtime Services（5 类核心）。 | 不冻结一个尚未被真实使用验证的 1.0 协议。 |
| 建立本地 `Orbit Profile` 导入/导出格式。 | 不把用户行为数据上传到任何服务端。 |
| 用 Clock + 第三异质 Widget 证明 Contract 的可复用性。 | 不追求大量官方 Widget 或主题皮肤。 |
| 补齐浏览器级集成测试（Playwright）、CI、文档和示例主题。 | 不在这一版重写全部 CSS 或更换构建体系。 |
| 至少 1 个真实外部站点接入试点。 | 不把 Music 业务全量拆解（→ v0.5）。 |

## 四、目标架构

v0.4 应保留“无框架、静态文件直接引入”的原则。运行时仍可由一个浏览器 bundle 交付，但内部需要从“Runtime 认识 Host”走向“Host 按 Contract 使用 Runtime Services”。

```text
静态站主题 / 页面
        │
        ▼
  Orbit Runtime Core
  ├─ Widget Registry & Contract Loader
  ├─ Lifecycle / Visibility / Portal Ownership
  ├─ Space & Layout Coordinator（可选注入）
  ├─ Gesture / Drag / Snap / Dock Services（可选注入）
  ├─ Launcher & Accessibility Services
  └─ Profile Store (local-first)
        │
        ├───────────────┬────────────────┬─────────────────┐
        ▼               ▼                ▼                 ▼
 Music Host          Clock Host       Reference Host A   Reference Host B
 第一方适配          第一方适配          独立功能形态        独立功能形态
```

### 4.1 `OrbitWidgetDefinition`：Contract Alpha（v2 修订）

Contract Alpha 的目标不是创造过度抽象，而是替代目前仅供内部使用的 `registerHost` 适配器。**v2 将 `ctx` 服务收敛为 5 类核心横切语义**：`lifecycle`、`visibility`、`profile`、`portal`、`launcher`。`layout`、`gesture`、`events`、`a11y` 不进入 Alpha 必选面——它们可以作为可选能力声明（`capabilities` 扩展点），但 Contract 的测试与文档只承诺 5 类核心。

```js
Orbit.register({
  id: "example-status",
  version: "0.4",
  label: "Example Status",
  capabilities: {
    draggable: true,
    dockable: true,
    launcher: true,
    profile: true
  },
  mount(ctx) {
    // ctx.lifecycle, ctx.visibility, ctx.profile, ctx.portal, ctx.launcher
    // 返回 WidgetInstance
  }
});
```

| Contract 部分 | 责任 | v0.4 的最低要求 |
|---|---|---|
| `id / version / label` | 稳定标识与用户可见名称。 | id 必须命名空间化或经合法性校验；Label 不得未经转义进入 HTML。 |
| `capabilities` | 声明希望使用的 Runtime 能力。 | 先支持 `draggable`、`dockable`、`launcher`、`profile`；未知字段必须安全忽略。 |
| `mount(ctx)` | 创建业务 DOM 并请求服务。 | 必须返回 WidgetInstance 或抛出可捕获错误；不得把业务 id 写进 Core。 |
| `WidgetInstance` | 由 Runtime 管理的实例边界。 | 必须有 `root`、`setVisible(bool)`、`destroy()`；可选 `portals()`、`snapshot()`。 |
| `ctx.lifecycle` | 所有副作用的唯一归属。 | 监听、observer、timer、rAF、媒体实例都必须可登记和逆序释放。 |
| `ctx.visibility` | 显隐过渡与 `aria-hidden` 协调。 | 隐藏不销毁；销毁后不得保留业务资源。 |
| `ctx.profile` | 按 Widget id 隔离的持久化服务。 | 数据必须 JSON 可序列化；无 DOM、无全局键名污染。 |
| `ctx.portal` | body 级 sheet/menu 的所有权与显隐。 | Runtime 能在 hide/destroy 时处理受声明的 portal。 |
| `ctx.launcher` | 元数据驱动的 Launcher 展示。 | Launcher 标签/排序/显隐只来自注册元数据，不得硬编码 id。 |

Contract Alpha 应明确标记为“`0.4 experimental`”，允许 0.5 发生一次可控的破坏性调整；但其核心生命周期语义不应含糊。**隐藏不销毁，销毁必释放，遗漏配置不等于销毁**是 v0.3 已建立、应被保留的语义。

### 4.2 Runtime Services 的设计原则

| Service | 应提供的能力 | 不应承担的能力 |
|---|---|---|
| `lifecycle` | 监听、timer、rAF、observer、async cancel 的注册和幂等清理。 | Widget 的业务流程或全局单例状态。 |
| `visibility` | 显隐过渡和 `aria-hidden` 协调。 | 销毁后偷偷保留业务资源。 |
| `profile` | 分 Widget 命名空间的本地状态、导入/导出。 | 账户、云端同步和行为追踪。 |
| `portal` | body 级 sheet/menu 的所有权与显隐。 | 具体 Widget 卡片的 DOM/CSS。 |
| `launcher` | 元数据驱动的标签、排序、显隐开关。 | 强制每个 Widget 使用同一视觉风格。 |
| `layout` / `gesture`（可选） | 位置读写、展开意图；指针会话与拖拽。 | 业务决定（如「短按播放」）。 |

## 五、v0.4 工作流与里程碑（v2 重排）

### Milestone 0：基线冻结与版本契约（✅ 本次审查后已执行）

不新增用户可见功能。固定 v0.3 回归矩阵；版本号建立单一来源（package.json → `src/core/version.js` → Runtime `version` → 文档/Demo 文案）；CI 收敛为 `npm run verify`；修复死链；重新生成 `site/`。

**已执行清单：**

- [x] `src/core/version.js` 成为 Runtime 版本唯一事实源；`Orbit.version` 改从该模块读取
- [x] package.json `0.3.0` → `0.4.0`；README / API.md / CHANGELOG / demo 徽章 / test-orbit.html 文案同步
- [x] 新增 `scripts/check-version.mjs`：package ↔ version.js ↔ dist ↔ 关键文档版本一致性门禁
- [x] 新增 `scripts/check-links.mjs`：README/CHANGELOG/docs 相对链接存在性检查
- [x] 创建缺失的 `docs/MIGRATION-v0.3.md`（README/CHANGELOG 死链修复）
- [x] `npm run verify` 单入口：`build + test(含 normalize) + check:dist + check:links + check:version`
- [x] `ci.yml` 只调用 `npm run verify`，与本地完全一致
- [x] `npm run prepare-site` 重建 `site/`，消除产物漂移

**验收条件（原 v1）：** README 不含死链；文档版本、Runtime `version` 和 Demo 文案一致；CI 中执行的测试集合与本地 `npm test` 完全一致；构建后 `git diff --exit-code` 为零。→ **全部达成**（产物漂移项由 check:dist + 提交前构建保证）。

### Milestone 1：Lifecycle Hardening（✅ 已执行 2026-08-16）

1. **前置清理（完成）**：删除未被生产路径引用的 `src/widgets/music/MusicWidget.js` 与 `PlaylistSource.js`，消除与 host 内联逻辑的 parity 双实现。
2. **先写失败测试（完成）**：新增 `tests/lifecycle.test.mjs`（Playwright + 系统浏览器，零下载）与 `npm run test:dom`。测试在页面脚本前 instrument `addEventListener/removeEventListener/Audio`，量化 document/window 监听净计数。**修复前红**：music 每轮 remount docNet +2 / winNet +2（8→10→12→14）、`window.__mpGhostClickBlocker` 永不清理——精确暴露累积泄漏。
3. **修复 Music Host（完成）**：`bindEvents` 全部监听具名化并注册进 LifecycleScope（destroy 逆序释放）；移除 `window.__mpGhostClickBlocker` 全局 flag（改模块级、destroy 复位）；destroy 清理 `moveRaf`/`pendingMove`/`longPressTimer`/`ignoreBallToggleUntil`/`bootTimer` 并复位惰性单例与 shell 状态；`alive` 守卫阻断 bodyObserver/PJAX 异步复活；seek 恢复监听具名化并入 lifecycle；rAF fix 防操作已销毁 root。
4. **Clock 保持（完成）**：现有 `destroyClockWidget` 已幂等且监听器入 scope，测试确认计数恒定，作为 Contract 参考实现。

**验收条件：** 对 Music 与 Clock 分别执行 `mount → destroy → mount` 三次；每轮后监听计数不增加；单次 pointer/click 只产生一次业务反应；不存在 detached root 引用；音频 element 和自有 portal 都被释放。全部由 Playwright 自动断言（`npm run test:dom`，**56 项断言全绿**），不依赖人工 Demo。→ **全部达成**

### Milestone 2：Contract Alpha 的“步行骨架”（✅ 已执行 2026-08-16）

用极小 `Reference Badge` / `Status` Widget 走通完整链路：`register → mount → profile read/write → launcher toggle → portal → destroy → remount`。拖拽/吸附按 Contract Alpha 的克制原则**不进必选面**（`capabilities.draggable` 可选声明，v0.4 不强制实现服务）。

**已执行清单：**

- [x] `Orbit.register(def)` 桥接到 HostAdapter 实例路径（复用验证过的 start/getRoot/destroy/visibility/Launcher 管理）
- [x] `ctx` 5 类核心服务：lifecycle / visibility / profile（`orbit-profile:<id>` 命名空间）/ portal（Runtime 负责拆除）/ launcher
- [x] Launcher 元数据驱动：移除 `LABELS` 硬编码，`Orbit.getLabel(id)` 三级回退；label/id 全量 HTML 转义（恶意 label XSS 断言通过）
- [x] boot 时序修复（defer 注册的 Widget 不再错过挂载）；`registerWidget` id 合法性校验；mount 返回校验 + `widgetError` 上报
- [x] `examples/reference-widget/badge.js` + `badge.css`：外部作者视角（仅公开 API），零 window/document 全局监听、零 Orbit 私有 class
- [x] `docs/CONTRACT-ALPHA.md` 接入指南；`tests/contract.test.mjs`（21 项断言全绿）+ `tests/_helpers.mjs` 共享基建

**验收条件：** 示例 Widget 的业务代码不直接操作 `window` 级全局监听（断言：badge 挂载前后 docNet/winNet 恒定）、不复制 Drag/Snap/Dock 算法、不写 Orbit 私有 CSS class；其接入指南能由独立开发者在一个空静态页面中完成（`tests/contract-test.html` 即空页接入证明）。→ **全部达成**

### Milestone 3：迁移 Clock 与第三异质 Host；Music 仅收口（✅ 已执行 2026-08-16）

- **Clock 优先迁移（完成）**：`clockWidgetDefinition` 导出，`mount(ctx)` 使用 ctx.lifecycle / ctx.profile（旧 key 一次性迁移回退），独立入口经 `createStandaloneCtx()` 保持行为不变（`lifecycle.test.mjs` [6] 回归）。
- **第三异质 Host（完成）**：Notice 公告卡——可折叠、关闭记忆（`ctx.profile` dismissed 持久化，重挂载默认隐藏、Launcher 显式打开恢复），验证 Contract 不绑定音频/时间业务域；`dist/floating-widget-notice.css` 独立样式。
- **Music（完成，最小适配层）**：`musicWidgetDefinition` 包装 start/destroy + `portals()` 上报 dock sheet；业务 shell 原状，全量拆解列 v0.5。
- **统一注册（完成）**：`entry-orbit.js` 三个 Widget 全部 `Orbit.register()`，删除 `registerHost` 生产路径；Runtime 零硬编码（Launcher 元数据驱动在 M2 已提前完成）。
- **Contract 增强（完成）**：`getVisibilityTargets` 支持 `WidgetInstance.portals()`。

**验收条件：** Clock 与第三 Widget 均使用同一套 register/mount/destroy/visibility/Profile API（✅，含 Music 包装）；Launcher 标签与排序只依赖 Contract 元数据（✅）；任意一个被隐藏或销毁不会破坏另两个（✅ `three-widget.test.mjs`：destroy music/clock 后其余 Widget 存活可交互、监听计数恒定）。→ **全部达成**

### Milestone 4：Profile Alpha 与可移植性（✅ 已执行 2026-08-21）

Profile 是 Orbit 开始产生用户连续性的最小形式，但 v0.4 只做本地优先与导入导出。记录 Runtime 级偏好（组件排序、可见性、布局）和每个 Widget 的隔离状态，附带 schema version、生成时间和可选站点 scope。

```json
{
  "schema": "orbit-profile/0.4",
  "exportedAt": "2026-08-21T00:00:00Z",
  "runtime": { "launcherKey": "Alt+O", "visibility": { "music": true, "clock": false } },
  "widgets": {
    "music": { "state": { "position": { "x": 0, "y": 0 } } },
    "clock": { "x": 120, "y": -20 }
  }
}
```

**已执行清单：**

- [x] `Orbit.exportProfile()` 聚合本地数据（可见性偏好 + 各 Widget `orbit-profile:<id>` 命名空间 + Music legacy `mp-state-v3` 为 `widgets.music.state`）为可移植 envelope
- [x] `Orbit.importProfile(objOrJson)`：schema 严格校验（`invalid-json`/`not-an-object`/`unsupported-schema` 清晰拒绝）、可见性**合并**导入、**单项损坏容错**（非对象条目跳过不阻断）、未知 Widget 数据原样保留、`profileImport` 事件
- [x] `docs/PROFILE.md`：数据位置表、导出/导入/清除、schema 演进策略、隐私承诺（数据只留本地、导出由用户主动触发、零上传）；纳入 npm 发布包与 check-pack
- [x] contract.test.mjs [8]：14 项 Profile 断言全绿（导出完整性、回写、拒绝、容错）

**验收条件：** Profile 可导出为 JSON（✅）；同 schema 下重新导入（✅ 回写可见性/Widget 状态/Music legacy）；忽略未知 Widget（✅ 不阻断、数据保留）；不因一个 Widget 状态损坏而阻断其他 Widget 恢复（✅ 单项容错）；向用户说明数据留在浏览器本地、导出由用户主动触发（✅ PROFILE.md 隐私章节）。→ **全部达成**

### v0.5 展望（v2 新增）

- Music 业务 shell 按 Contract 全量拆解（一次性破坏性调整窗口）。
- `layout`/`gesture` 服务从可选提升为正式 Contract 服务。
- 若 ≥2 个独立站点实际采用同一 Profile schema，再讨论可选同步；在此之前坚持 local-first。

## 六、测试与质量门禁（v2 修订）

| 层级 | 测试对象 | 发布门槛 |
|---|---|---|
| Unit | Layout、Gesture、Snap、Contract schema、Profile migration。 | 关键纯逻辑分支与错误输入全覆盖。 |
| DOM integration（**Playwright**） | mount/visible/destroy/remount、portal 所有权、Launcher、焦点。 | 用例数控制在 3–5 条：Music 生命周期、Clock 生命周期、Reference Widget 生命周期、三 Widget 并存、Launcher 焦点。 |
| Regression | 三 Widget 并存、隐藏全部、ghost 恢复、窄视口、reduced motion。 | 每次发布前自动执行。 |
| Manual device | iOS/Android 长按、拖拽、Dock、横竖屏、低端性能。 | 发布 checklist 中必须记录设备与浏览器。 |
| Package | build、dist sync、**版本一致性（check:version）**、**文档链接（check:links）**、`npm pack --dry-run`。 | CI 阻断任何产物、版本或文档漂移。 |

CI 最小命令收敛为 `npm run verify`（build + test 含 normalize + check:dist + check:links + check:version）；工作流和本地开发调用同一入口，杜绝测试集合漂移。

## 七、文档与生态交付物

| 文件 | 面向对象 | 必须回答的问题 |
|---|---|---|
| `docs/CONTRACT-ALPHA.md` | Widget 作者 | 如何声明、挂载、持久化、使用 portal、处理销毁。 |
| `docs/HOST-MIGRATION-v0.4.md` | v0.3 Host 维护者 | `registerHost` 如何迁移；哪些 API 仍兼容；何时废弃。 |
| `docs/PROFILE.md` | 用户与主题维护者 | 数据保存在何处；如何导出、导入和清除；schema 如何演进。 |
| `examples/reference-widget/` | 独立开发者 | 如何从零接入一个不依赖内部私有模块的 Widget。 |
| `docs/SECURITY.md` | 部署者 | 外部音源（Meting 类 API 的失效与替换）、CSP、动态文本、第三方 Widget 的边界。 |
| `CHANGELOG.md` | 全部使用者 | Contract Alpha 的稳定性等级、已知限制与升级动作。 |

## 八、v0.4 发布定义（Definition of Done，v2 收敛为五项）

v0.4 可以发布，必须同时满足以下条件：

1. **Lifecycle 可信。** Music、Clock 和 Reference Widget 都通过至少三次连续 destroy/remount 的自动 DOM 测试；无重复全局监听、无残留 portal、无已销毁 root 的异步复活。
2. **Contract 可用。** 一个不依赖 Orbit 内部源码的 Reference Widget 能仅通过公开 Contract 接入 Runtime，并使用显隐、Launcher、Profile 与销毁服务。
3. **Core 不再硬编码首批 Widget。** Launcher 标签、可见性、portal 所有权和实例列表由 Contract 元数据提供；内置 Widget 只是注册者。
4. **Profile 可移植。** 用户可安全导入导出本地 Profile；未知 Widget 和 schema 兼容失败均有清晰、非破坏性的行为。
5. **质量闭环存在。** CI 使用统一 verify 命令，覆盖 unit、DOM integration、构建产物、版本一致性、文档链接和 npm pack；README 与发布包无死链；版本号全程单一来源。
6. **外部试点完成。** 至少 1 个非仓库作者的静态站按公开文档完成接入并反馈（v2 新增，替代原「三 Widget 全迁移」项）。
7. **对外语义诚实。** 版本仍标示 Contract 为 Alpha，不承诺未经真实外部使用验证的 1.0 稳定性。

## 九、v0.4 的北极星指标

> **一个不熟悉 Orbit 内部代码的开发者，能否在不复制拖拽、吸附、移动端手势、显隐、焦点管理、生命周期和本地状态代码的情况下，完成一个可发布 Widget 的接入？**

建议记录如下事实指标：外部示例 Widget 的业务代码行数；接入一个空站点的步骤数；destroy/remount 回归次数；三 Widget 并存时的手势冲突数；独立开发者首次接入成功率；**外部试点站点的接入耗时与文档修订数（v2 新增）**。

## 十、风险与决策原则（v2 修订）

1. **过度抽象**（保留）：Contract 若要求每个 Widget 理解太多布局和状态细节，就会重复当前 Music Host 的复杂性；若 Contract 太薄，又无法减少接入样板。v2 的解法是**只固定五类横切语义**，复杂业务 UI 保留给 Host。
2. **Profile 锁定用户**（保留）：坚持 local-first、可导出、可删除，只有在多个独立站点/主题真的使用同一 schema 后，才讨论可选同步。
3. **官方示例伪装成生态**（保留 + 强化）：三个 Widget 可以全部由核心仓库维护，但至少一个要以外部作者文档、独立目录和仅使用公开 API 的方式实现；v2 新增**真实外部站点试点**作为 DoD 门槛，杜绝用内部知识绕过 Contract 缺口。
4. **（新增）Music 双实现漂移**：`src/widgets/music/*` 与 host 内联逻辑并存，若不在 Milestone 1 清理，Contract 迁移时会先陷入「哪份代码是真相」的泥潭。
5. **（新增）外部音源依赖**：Music 演示依赖公共 Meting 兼容 API，其失效会直接打击产品观感。v0.4 不解决音源问题（属业务层），但 `SECURITY.md` 必须写明替换路径与失败降级。
6. **（新增）单作者范围控制**：v2 已把最长的杆（Music 全量迁移）移出本版；若 M1–M4 排期超出 4–6 周，允许按 M4 → M3 第三 Host → M2 的顺序砍内容，**M1 与 M0 不可砍**。

## 参考资料

[1]: https://github.com/ykpgp0928/Orbit/blob/main/README.md "Orbit README"
[2]: https://github.com/ykpgp0928/Orbit/blob/main/src/core/Orbit.js "Orbit Runtime"
[3]: https://github.com/ykpgp0928/Orbit/blob/main/src/host/music-player-host.js "Music Host"
[4]: https://github.com/ykpgp0928/Orbit/blob/main/src/host/clock-host.js "Clock Host"
[5]: https://github.com/ykpgp0928/Orbit/blob/main/package.json "构建与测试脚本"
[6]: https://github.com/ykpgp0928/Orbit/blob/main/.github/workflows/ci.yml "CI 工作流"
