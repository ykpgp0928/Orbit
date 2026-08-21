# Orbit v0.5 方案：从 Contract Alpha 到被外部作者验证的兼容层

**建议版本名：** `v0.5 — External Adoption & Contract Beta`  
**前置版本：** 已验证的 `v0.4.0 — Runtime Hardening & Contract Alpha`  
**版本性质：** 采用验证版，而非功能扩张版  
**作者：** Manus AI

## 一、版本命题

v0.4 已经回答了一个内部工程问题：Orbit 的 Runtime、Profile、Portal、Lifecycle 和首批 Widget Contract 能否在浏览器中可靠工作。完整验证表明答案是肯定的。然而，v0.4 尚未回答更重要的产品问题：**一个不参与 Orbit Core 开发的人，是否愿意并能够依赖这套 Contract？**

因此，v0.5 的唯一版本命题应当是：

> **让独立 Widget 作者和静态站主题维护者，在不接触 Orbit 私有源码的条件下，成功开发、安装、升级并维护 Orbit Widget；用他们的反馈决定 Contract 哪些部分值得进入 Beta。**

这不是“招募用户测试一下”的轻量活动，而是 Orbit 从代码资产走向兼容性资产的关键转换。只有当不同维护者开始面向同一 Contract 构建、不同主题开始承载同一 Widget、一次升级开始被外部项目经历，Orbit 才会出现初步的迁移成本和网络效应。

## 二、v0.5 必须解决的问题

| v0.4 已证明 | v0.5 必须证明 | 为什么重要 |
|---|---|---|
| Core 在官方 Host 与参考页面中能工作。 | 外部作者无需 Core 作者介入也能接入。 | 防止“内部示例伪装成开放平台”。 |
| Contract 有文档和 Reference Widget。 | 文档、包和诊断足以替代内部知识。 | 决定接入成本是否真的下降。 |
| Widget 可在一个测试页面中运行。 | 同一 Widget 可在不同主题/静态站形态中运行。 | 证明 Runtime 不是 Demo 专用外壳。 |
| Profile 具备 local-first 导入导出。 | 不同 Widget/主题升级后仍能保留用户连续性。 | 让 Orbit 开始承载可迁移的用户偏好。 |
| Alpha 可以改变。 | 哪些 API 经外部使用后足以升级为 Beta。 | 避免内部想象替代真实需求。 |

v0.5 的北极星问题不是“又新增了几个 Widget”，而是：

> **一位独立开发者能否只使用发行包、公开 Contract 文档和示例，在两个不同 Orbit Host 中交付一个无需复制生命周期、显隐、Launcher、Profile 或 Portal 样板的 Widget？**

## 三、产品边界：v0.5 做什么，不做什么

v0.5 需要克制。为了验证开放契约，必须减少由官方 Widget 业务需求驱动的过度抽象。

| v0.5 必做 | v0.5 不做 |
|---|---|
| 建立独立 Widget 作者与主题维护者的试点路径。 | 不建设 Widget 商城、账号、支付、云同步或远程执行平台。 |
| 将 v0.4 Contract 作为 Alpha 起点，经过真实接入后收敛成 Beta。 | 不为“看起来完整”而一次性公开 layout、gesture、drag、dock 全部内部能力。 |
| 建立安装、兼容、升级与诊断的工具链。 | 不要求所有主题更换技术栈、采用 npm 或引入框架。 |
| 验证至少两个独立 Widget、两个主题/静态站形态。 | 不把两个官方示例当作独立生态。 |
| 以 issue / RFC 证据决定 API 的新增与冻结。 | 不根据单一 Widget 的便利性扩张 Core。 |
| 维持 local-first Profile 与可移植 schema。 | 不将 Profile 变成锁定用户的私有账户数据。 |

特别要避免把“读者伴随层”“更多官方面板”作为 v0.5 主线。它们可以是独立作者的候选 Widget，但不能成为 Runtime 演化的理由。v0.5 的产品是**采用过程本身**。

## 四、采用验证设计

### 4.1 试点角色与最低样本

需要有明确的维护边界，而不是由同一个 Core 作者模拟多种身份。建议至少组成下表中的四个独立角色；若无法获得外部贡献者，也应将其放入独立仓库、由不阅读 Core 的协作者完成，并如实标注“受控试点”，不能宣称生态已形成。

| 角色 | 最低数量 | 任务 | 必须避免的行为 |
|---|---:|---|---|
| 独立 Widget 作者 | 2 | 各自实现一个业务形态不同的 Widget。 | 不 import `src/`、不复制 Core 私有 DOM/CSS、不得由 Core 作者代写接入逻辑。 |
| 主题/站点维护者 | 2 | 在不同静态站形态中加载同一个外部 Widget。 | 不把特定主题 selector 或修补逻辑提交到 Runtime Core。 |
| 用户试用者 | 3–5 | 安装、位置调整、显隐、Profile 导入导出和升级反馈。 | 不要求登录或上传数据。 |
| Core 维护者 | 1+ | 提供文档、诊断、issue triage、兼容测试与发布。 | 不以私有知识绕过公开 Contract 的缺口。 |

两个试点 Widget 不应业务同构。推荐使用下列“能力压力”而非固定功能名称来选择：

| 试点类型 | 应覆盖的 Contract 能力 | 可选业务例子 |
|---|---|---|
| 轻状态 Widget | Profile、Visibility、Launcher、Lifecycle。 | 阅读进度标记、站点状态、专注计时、收藏队列计数。 |
| Portal Widget | Portal、焦点/关闭、Profile、实例隔离。 | 快捷导航、上下文操作卡、轻量书签面板、页面目录。 |
| 非交互/周期 Widget | 更新周期、隐藏恢复、reduced motion、销毁。 | 状态提醒、倒计时、会话状态或信息 badge。 |

并非每个 Widget 都需要拖拽或 Dock。v0.5 应验证“一个 Widget 只请求它实际需要的能力”这一原则，避免把 Orbit 简化成所有业务都必须是球形控件的框架。

### 4.2 主题与部署形态

至少选择两类 Host：一个真实 Hexo 或相近静态博客主题；一个纯静态 HTML、Cloudflare Pages、Hugo、Astro 导出页或其他无框架部署形态。目标不是扩展支持列表，而是证明 Orbit 的交付形态确实保持“静态文件直接引入”的初衷。

| Host 维度 | 试点 A | 试点 B | 应记录的差异 |
|---|---|---|---|
| 加载方式 | 主题 inject / 页面模板。 | 原生 `<script defer>` 或构建产物。 | 脚本顺序、CSS 注入、DOM ready。 |
| 页面导航 | 可含 PJAX。 | 全页刷新或客户端路由。 | Root/Portal 恢复、destroy 时机。 |
| 样式约束 | 强主题 CSS、深浅色、移动端。 | 极简 CSS 或不同设计语言。 | class 冲突、z-index、字体继承。 |
| CSP | 默认或宽松策略。 | 显式 CSP 策略。 | Runtime、媒体与 Widget 需要的来源。 |
| 发布方式 | 主题资产目录。 | npm/文件复制/静态部署。 | 包文件完整性、版本锁定与升级路径。 |

同一独立 Widget 至少应在两个 Host 上运行一次。这是 v0.5 最重要的互操作证据，远比再增加多个仅运行在 Demo 的 Widget 有价值。

## 五、Contract Beta 的演化规则

### 5.1 保持 v0.4 已有核心语义稳定

下列语义已经有完整测试，应视为 v0.5 的稳定地基。除非存在安全或数据损坏级别的问题，不应在 0.5.x 中改变它们。

| 语义 | v0.5 承诺 |
|---|---|
| `setVisible(false)` | 只隐藏，不隐式销毁业务资源。 |
| `destroy(id)` | 显式销毁；默认保留用户可见性偏好，`{ forget: true }` 清理该偏好。 |
| 配置遗漏 | `ORBIT.widgets` 省略已挂载 Widget 不代表销毁。 |
| Lifecycle | cleanup 幂等、逆序、异常隔离；已销毁实例不得被异步恢复。 |
| Portal | Runtime 可随显隐与销毁管理已声明 Portal；body swap 后应恢复。 |
| Profile | `orbit-profile/0.4` 严格 envelope、单项容错、未知 Widget 数据保留。 |
| 用户数据 | local-first；不引入隐式网络上传。 |

### 5.2 新 API 的证据门槛

v0.5 最容易失控的地方，是看到一个新 Widget 需要布局或手势能力，就直接把内部模块暴露为公共 API。应建立明确的 API 证据门槛。

| 拟新增能力 | 可以进入实验 API 的条件 | 可以升级为 Beta 的条件 | 否则的处理 |
|---|---|---|---|
| `ctx.layout` | 两个试点 Widget 遇到相同位置/视口问题，且无法用 root CSS/业务逻辑合理解决。 | 两个独立维护者在不同 Host 中使用，且 API 不泄漏特定 Widget 几何常量。 | 保持为 Widget 私有布局或提供示例。 |
| `ctx.gesture` | 两个 Widget 需要相同的 pointer/长按/取消语义。 | 有跨浏览器与 destroy-in-flight 回归；业务 action 与手势机制可分离。 | 继续使用 Widget 自己的局部交互。 |
| `ctx.dock` / `ctx.drag` | 至少一个外部 Widget 真的需要空间停靠，而非“所有 Widget 都应该能拖”。 | 与 Position/Profile、窄视口、Portal、Launcher 无冲突。 | 不公开；避免把 Music 交互原样复制为通用 API。 |
| `ctx.events` | 两个独立 Widget 需要文档化的跨 Widget 协调。 | 事件有版本化 payload、权限/命名空间与错误边界。 | 使用页面业务层协调，不让 Core 成为全局 event bus。 |
| `ctx.a11y` | 外部作者反复遇到焦点、Escape、reduced motion 或 announcement 缺口。 | 有键盘、屏幕阅读器与移动端回归。 | 在 Contract 指南中给出规范，而非仓促加 API。 |

**核心原则：** 单一作者的方便不是公共 API 的充分理由；两个独立采用场景中重复出现的摩擦，才是 Runtime 演化的信号。

### 5.3 从 Alpha 到 Beta 的 Contract 标签

建议在 v0.5 中引入非常轻量的 Contract 标识，但不要过早构建复杂 Manifest 系统。可以先在 Definition 中加入可选字段，并让 Runtime 在开发模式/诊断页报告兼容性。

```js
window.Orbit.register({
  id: "example.reader-progress",
  version: "0.1.0",
  orbit: { contract: "0.4-alpha" },
  label: "Reading Progress",
  capabilities: { launcher: true, profile: true },
  mount(ctx) {
    // 仅使用公开 ctx 服务
  }
});
```

| Contract 标识 | 语义 | Runtime 行为 |
|---|---|---|
| `0.4-alpha` | 允许试点；可在 v0.5 出现受控破坏性调整。 | 启动并在诊断中显示试验状态。 |
| `0.5-beta` | 经外部试点验证的稳定候选 surface。 | 支持该范围内的 Widget，记录不兼容警告。 |
| 未声明 | 兼容 v0.4 参考用法，但不享受兼容承诺。 | 启动时给开发诊断提示，不在生产环境打扰用户。 |

不要让 `orbit.contract` 变成 npm 依赖求解器。v0.5 只需要让 Runtime、Widget、主题维护者能看见“我依赖什么”“是否已测试过”，以便开始形成兼容矩阵。

## 六、v0.5 交付物

### 6.1 作者体验包

| 交付物 | 内容 | 成功标准 |
|---|---|---|
| `create-orbit-widget` 模板或等价 starter | 最小 Definition、CSS 命名空间、Profile、Portal、destroy、测试入口。 | 作者复制后只修改业务逻辑即可运行。 |
| Contract 测试 fixture | 在无业务主题的静态页加载外部 Widget，执行 mount/hide/destroy/remount/Profile/Portal 断言。 | 外部 Widget 可在自己的 CI 中复用，而不 import Core 源码。 |
| Widget author checklist | 生命周期、DOM 所有权、XSS、CSP、Profile JSON、reduced motion、错误处理。 | PR/发布前能机械执行。 |
| 诊断页 | 显示 Runtime version、Widget ids、Contract 标识、实例状态、Profile 状态、Portal 数与可见性。 | 接入故障不再需要 Core 作者通过控制台猜测。 |
| 兼容矩阵 | Runtime、Widget、Theme Adapter、浏览器、验证版本与已知问题。 | 每个试点组合均有可链接记录。 |

`create-orbit-widget` 不一定要在 v0.5 第一日就成为 CLI。一个可复制的独立目录或 GitHub template 也足够；重要的是它只能依赖公开发行包和公开文档。

### 6.2 主题维护者体验包

| 交付物 | 主题维护者需要得到的答案 |
|---|---|
| `docs/THEME-ADAPTER.md` | 在 head/bottom 注入什么、defer 顺序如何、CSS 如何隔离、PJAX 如何处理。 |
| 最小 Adapter 示例 | 如何加载 Runtime、First-party Widget、第三方 Widget 与 `window.ORBIT` 配置。 |
| CSP 指引 | 何时需要 `connect-src`、`media-src`；第三方 Widget 的网络边界。 |
| 样式冲突说明 | z-index、root id、CSS 变量、字体/色彩继承和 `prefers-reduced-motion`。 |
| 升级清单 | Runtime/Widget/theme 各自升级时要验证什么，如何回滚。 |

主题 Adapter 的职责应该是“把 Orbit 接到页面”，而不是“重实现 Orbit 的挂载、布局和清理”。若每个主题都要写一段 Core 适配补丁，说明 Contract 仍不够成熟。

### 6.3 诊断与测试能力

v0.5 应把“可观察性”当作采用成本的一部分。建议新增只在开发/显式开启时出现的 `Orbit.diagnose()` 或独立诊断页面；它不应默认显示给终端用户。

| 诊断项 | 示例输出 | 用途 |
|---|---|---|
| Runtime 信息 | version、Contract 支持范围、配置来源。 | 定位版本漂移。 |
| Widget 状态 | registered / started / visible / destroyed、root 是否在 body。 | 定位 mount 或 PJAX 问题。 |
| 生命周期提示 | 活跃 portal 数、被管理的 listener/timer（若可安全提供）。 | 定位 destroy/remount 问题。 |
| Profile 状态 | schema、已存 Widget key、可见性偏好。 | 定位导入导出与状态恢复。 |
| 兼容性 | Widget 声明的 Contract、Runtime 已测试范围、warning。 | 避免隐式“不兼容但看似能跑”。 |

测试方面，所有外部试点 Widget 都应在自己的仓库里执行以下最小矩阵：静态页面冷启动、hide/show、destroy/remount 两轮、Profile export/import、一个窄视口、一个 Host 切换。若 Widget 有 Portal 或媒体，再增加 body swap 或资源清理用例。

## 七、实施阶段与验收门槛

### 阶段 0：v0.4 发布与试点准备

在任何 v0.5 API 设计之前，先发布可复现的 v0.4.0 并建立反馈入口。创建三个标签：`contract-alpha`、`external-widget`、`theme-adapter`。所有反馈应记录使用的 Runtime、Widget、主题、浏览器、部署方式和最小复现。

**通过条件：** 发布 tag、npm 包、Demo、文档与公开 issue 模板一致；试点参与者无需获取私有构建或未提交文件。

### 阶段 1：两条独立 Widget 接入线

让两位独立作者使用 v0.4 Contract 开发业务不同的 Widget。Core 维护者只可回答公开文档已有内容；若必须补充信息，应先写入文档或 issue，避免私聊知识成为事实 API。

**通过条件：** 两个 Widget 均有独立仓库/维护边界、可从发行包安装、没有 `src/` import、各自通过公开 lifecycle fixture。

### 阶段 2：跨主题运行与用户连续性验证

选取其中至少一个 Widget 在两个不同主题/Host 中运行，测试安装、Launcher、Profile 导入导出、窄视口、PJAX/全页刷新之一和升级。此阶段的重点是记录主题差异，而不是把所有差异折叠进 Core。

**通过条件：** 同一 Widget 在两个 Host 的核心功能与 destroy/remount 都通过；主题差异有 Adapter 文档或明确的非目标说明。

### 阶段 3：需求归因与 Contract Beta 提案

归集试点摩擦：安装、配置、样式、布局、手势、Profile、权限、升级。每一个需求必须标注来源数量、是否能在 Widget/Theme 层解决、是否会影响现有 Contract、测试设计和弃用策略。

| 决策结果 | 条件 | 行动 |
|---|---|---|
| 保持在 Widget 层 | 仅一例需求，或强业务耦合。 | 在示例/模板中解决，不改 Core。 |
| 进入实验 API | 两个独立场景的同类问题。 | 标记 experimental，提供版本、文档与回归。 |
| 升级为 Contract Beta | 多 Host 验证、没有私有耦合、定义清晰。 | 发布 `0.5-beta` 能力与迁移说明。 |
| 延期/拒绝 | 会引入框架绑定、全局状态污染、远程执行或不必要复杂度。 | 解释非目标，记录替代方案。 |

### 阶段 4：一次真实升级

在正式进入 v0.6 前，必须让至少一个外部 Widget 经历一次 Runtime patch/minor 升级；这比写更多兼容承诺更能检验治理能力。升级不应要求其重写 Widget，除非采用显式标识为 experimental 的 API。

**通过条件：** 外部 Widget 不修改或只按清晰迁移指南修改少量公开代码即可通过新版本 fixture；兼容矩阵更新并公开记录结果。

## 八、v0.5 的衡量方式

| 指标 | 最低目标 | 解释 |
|---|---:|---|
| 独立维护 Widget | 2 个 | 维护者不属于 Core 日常开发，且有不同业务形态。 |
| 独立 Host/主题形态 | 2 个 | 至少一个 Widget 跨两个 Host 成功运行。 |
| 私有耦合 | 0 处 | 试点 Widget 不 import `src/`、不依赖未文档化全局变量或私有 class。 |
| 公开接入闭环 | 100% | 所有实际接入步骤可由文档、示例或 issue 公开复现。 |
| 生命周期回归 | 0 个 P0/P1 未修复问题 | 外部 Widget 发现的问题必须进入 fixture 或回归套件。 |
| Profile 往返 | 至少 1 次 | 在不同 Host/页面中导出后导入，已知/未知 Widget 数据按语义保留。 |
| 外部升级 | 至少 1 个案例 | 外部 Widget 成功跨一次 Orbit 版本升级。 |
| Contract API 新增 | 仅证据驱动 | 每项 Beta API 至少有两个独立需求来源和测试。 |

这些指标不是市场 KPI，而是“兼容性网络是否开始出现”的早期证据。即使只有两个 Widget，它们若由独立作者维护并能跨主题运行，也比十个官方 Demo 更能提高 Orbit 的长期价值。

## 九、风险与防偏原则

| 风险 | 常见错误 | 防偏原则 |
|---|---|---|
| 伪生态 | Core 作者建多个示例仓库后宣称插件生态。 | 必须区分官方示例、受控试点与真正独立维护。 |
| 过度抽象 | 为一个 Widget 暴露完整 drag/dock/layout 系统。 | 以两个独立需求为 API 门槛。 |
| API 漂移 | 试点反馈一来就直接改现有 surface。 | 先记录 RFC，附迁移、测试与版本策略。 |
| 主题耦合 | 把某主题特例写入 Runtime。 | Theme Adapter 优先；Core 只管理通用页面级语义。 |
| 测试幻觉 | 只在 Orbit demo 中验证外部 Widget。 | 外部仓库 + 两种 Host + 自己的 CI fixture。 |
| 数据锁定 | 用 Profile 同步或账号制造粘性。 | 保持 local-first、可导出、可删除；价值来自兼容性。 |
| 范围膨胀 | v0.5 同时重构 Music、做新 Widget、做市场和同步。 | v0.5 只投资“外部作者可以成功”的路径。 |

## 十、v0.5 Definition of Done 与通向 v0.6 的门槛

v0.5 不应以版本发布日期定义完成，而应以外部依赖事实定义完成。

| 条件 | 必须满足的证据 |
|---|---|
| 独立 Widget | 至少 2 个，来自不同维护边界，均只使用公开发行包和 Contract。 |
| 跨 Host 兼容 | 至少 1 个 Widget 在 2 个不同主题/静态站形态中通过核心矩阵。 |
| 公开作者路径 | 从零接入所需步骤、问题和解法均已写入文档/issue，未依赖 Core 私聊支持。 |
| 可靠性 | 外部 Widget 的 lifecycle、Portal、Profile 与升级问题都已有自动化回归。 |
| Contract 变更治理 | 每项 Beta API 有证据、RFC、文档、测试和迁移说明。 |
| 真实升级 | 至少一个外部 Widget 成功跨 Runtime 版本升级。 |
| 兼容矩阵 | Runtime、Widget、Theme Adapter 与浏览器的已验证组合公开可见。 |
| 非目标纪律 | 未引入账户、云同步、市场、远程脚本执行或框架绑定。 |

若这些条件未满足，Orbit 应继续发布 `0.5.x`，而不是贸然进入 `0.6` 或宣布稳定插件平台。若满足，v0.6 的任务才可以是 Contract Candidate：缩小变更面、建立 manifest/版本协商的最小形式、执行兼容周期，并为 1.0 做准备。

## 十一、最终结论

v0.4 已经把 Orbit 从“高质量的官方组件实现”推进为“可试用的 Runtime”。v0.5 必须抵制继续堆功能的冲动，转而检验这个 Runtime 是否真的能被外部人采用。

Orbit 的不可替代性不会来自一段无法复制的拖拽算法，也不会来自把用户数据锁进服务端。它会来自一个更朴素但更有价值的事实：**Widget 作者一次实现即可跨 Host 工作，主题维护者一次接入即可承载多个 Widget，用户的偏好可以随 Profile 延续，而替换 Runtime 会损失已经验证过的兼容性。**

> **v0.5 的目标不是证明 Orbit 很复杂，而是证明 Orbit 值得被依赖。**

## 参考基线

[1]: ./Orbit v0.4 后续行动清单：从通过验证到可信发布.md "Orbit v0.4 后续行动清单"
[2]: ./CONTRACT-ALPHA.md "Orbit Widget Contract Alpha"
[3]: ./PROFILE.md "Orbit Profile（0.4 Alpha）"
[4]: ../tests/contract.test.mjs "Contract Alpha 浏览器级验证"
[5]: ../tests/three-widget.test.mjs "三 Widget 与主题恢复验证"
