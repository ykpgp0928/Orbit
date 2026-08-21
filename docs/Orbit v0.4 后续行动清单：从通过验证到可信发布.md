# Orbit v0.4 后续行动清单：从通过验证到可信发布

**版本定位：** `v0.4.0 — Runtime Hardening & Contract Alpha`  
**输入基线：** 完整 ZIP 基线已通过 `npm run verify`，含 127 项浏览器断言、构建、产物、链接、版本与发布包检查  
**本文目的：** 明确 v0.4 接下来该做什么，以及哪些工作不应继续塞入 v0.4  
**作者：** Manus AI

## 一、核心判断

v0.4 的核心工程任务已经完成：Contract Alpha 真实接入 Runtime，Music、Clock、Notice 的生命周期与隔离路径已被浏览器级回归覆盖，Profile Alpha 已具备 local-first 导入/导出，发布包也已包含文档与示例。此时最危险的做法不是发布得太早，而是继续把原本属于 v0.5 的能力塞入 v0.4，导致刚刚获得的可验证边界再次漂移。

> **v0.4 的下一步不是继续扩写 Runtime；而是将已验证的状态固化为可复现发布物，并让使用者准确理解“Contract Alpha 已可试用、尚未冻结”的边界。**

以下行动按顺序执行。每一项都有明确的完成证据；只有前一批完成，才进入后一批。

## 二、批次 A：发布前基线冻结

当前 ZIP 的工作区相对 Git `HEAD 5c61af8` 仍是大规模未提交改动。第一优先级是把“测试通过的本地状态”变成可重建、可审阅、可回退的发布基线。

| 工作项 | 具体动作 | 完成证据 | 优先级 |
|---|---|---|---|
| 清理工作区 | 删除不应提交的 `node_modules`、临时日志、浏览器下载缓存与本地审阅产物；检查 `.gitignore`。 | `git status` 只剩有意纳入 v0.4 的源码、dist、文档和测试改动。 | P0 |
| 复现构建 | 在干净 clone 或 CI runner 执行 `npm ci`、浏览器安装、`npm run verify`。 | 无本地残留依赖时完整通过，记录 commit SHA 与完整日志。 | P0 |
| 锁定提交 | 将 M0–M4 改动分成语义清楚的 commit，至少区分 Runtime/Host、tests、docs/packaging。 | PR 或 commit 序列可独立审阅；最后一个 commit 在干净环境验证通过。 | P0 |
| 审核产物 | 比较 `src/` 与 `dist/`，确认 `check:dist` 的成功来自当前源码而非旧产物。 | `npm run build && npm run check:dist` 通过，提交后无意外 dist 漂移。 | P0 |
| 固定发布版本 | 核实 `src/core/version.js`、package、README、API、demo、CHANGELOG 同为 `0.4.0`。 | `npm run check:version` 通过，且该检查继续留在 verify。 | P0 |

这一批不应引入新 Widget、公开 layout/gesture 服务或重写 Music。任何“顺手优化”都应进入 v0.4.1 或 v0.5 的 issue，避免破坏已验证矩阵。

## 三、批次 B：完成 Alpha 发布交付物

v0.4 的交付物不只是 `dist/orbit.js`。对于一个希望被第三方试用的 Runtime，最重要的是让首次接入者知道可以依赖什么、不能依赖什么、出问题时如何诊断。

| 工作项 | 对外内容 | 验收标准 |
|---|---|---|
| 发布说明 | 将 CHANGELOG 重新组织为“新增能力、破坏性影响、已知限制、升级动作”。 | 明确写出 Contract 为 `experimental / Alpha`，可在 v0.5 调整。 |
| Contract 快速路径 | 保留 `docs/CONTRACT-ALPHA.md` 和 Reference Widget，并增加“从空页面到可运行”的最短路径。 | 第三方无需阅读 `src/` 即能完成 register、mount、visibility、profile、portal 与 destroy。 |
| Profile 使用说明 | 发布 `docs/PROFILE.md`，解释 schema、导出/导入、未知 Widget 保留、本地隐私边界。 | 用户能理解数据留在浏览器本地；导入失败有清晰错误语义。 |
| 可运行样例 | 发布或部署最小 Contract 页面，并提供可复制的 script 顺序。 | 可验证 defer 注册次序、Launcher metadata 与 body-level portal。 |
| 发布包透明度 | 保留 `check:pack`，确保 npm 包含 `examples/`、Contract、Profile、Migration 和 dist。 | `npm pack --dry-run` 与 `check:pack` 都通过。 |
| 安全与部署注记 | 在 README 或独立文档中说明外部音源、CSP、第三方 Widget 动态文本的边界。 | 部署者能配置最小的 `connect-src` / `media-src`，且知道 Widget label/text 不应被信任为 HTML。 |

### 建议的发布标题与表述

可以使用如下表述，以避免不必要地夸大版本承诺：

> **Orbit v0.4.0 — Runtime Hardening & Contract Alpha**  
> 这是一次面向静态站悬浮交互 Runtime 的架构发布。它引入实验性的 Widget Contract、local-first Profile 与完整生命周期回归；欢迎外部 Widget 作者试用并反馈，但 Contract 尚未冻结为 1.0 API。

这比“插件生态已就绪”更真实，也更能赢得未来使用者的信任。

## 四、批次 C：发布后的短期维护规则

v0.4 发布后应进入一个**观测期**，而不是马上开始大型重构。观测期的目的，是确认 Alpha 在真实主题、浏览器和用户配置下是否会暴露测试环境无法覆盖的问题。

| 类别 | 应立即处理 | 应记录、等待 v0.5 决策 | 不应在 v0.4.x 做 |
|---|---|---|---|
| 生命周期 | destroy/remount 泄漏、已销毁实例复活、监听/portal/audio 残留。 | 外部作者需要的新 lifecycle helper。 | 改写 Contract 的核心语义。 |
| 安全 | XSS、跨站脚本、错误的动态文本处理、数据意外上传。 | Widget 权限模型的设计需求。 | 未经设计直接引入远程 Widget 执行机制。 |
| 兼容性 | 主流浏览器、PJAX body swap、窄视口、reduced motion 的明确回归。 | 主题/框架适配差异。 | 将特定主题 DOM 选择器写进 Core。 |
| 文档 | 死链、错误示例、漏掉的配置前置条件。 | 第三方接入中反复出现的说明缺口。 | 为单一使用者创建私有 API。 |
| Contract | 会导致已有 Alpha Widget 无法运行的 P0/P1 缺陷。 | 多个使用者共同提出的能力需求。 | 为某一个官方 Widget 私自扩展公开 surface。 |

建议将 bug 修复发为 `0.4.x` patch，且 patch 不增加新的必选 Contract 字段；任何会影响 Definition、ctx、Profile schema 或版本协商的变更，默认进入 v0.5 提案。

## 五、v0.4 发布后的观测指标

Orbit 不应以新增 Widget 数量判断 v0.4 成败。应记录能证明 Runtime 是否被独立使用的事实。

| 指标 | 记录方式 | 它回答的问题 |
|---|---|---|
| 首次接入成功率 | 让试用者按公开文档从空静态页接入，记录卡点和完成率。 | 文档是否真的替代了内部知识。 |
| 首次接入耗时与步骤 | 记录从下载到可运行的步骤数、错误类型和必要配置。 | Contract 是否减少了接入样板。 |
| 公开 API 外溢 | 检查示例/试用项目是否 import `src/` 或依赖私有 DOM id/class。 | Contract 是否足够，而非只在 Demo 中可用。 |
| 生命周期缺陷 | 汇总 destroy/remount、PJAX、媒体、Portal、pointer 相关 issue。 | M1 的工程承诺是否在真实环境成立。 |
| Profile 恢复质量 | 导入/导出和未知 Widget 保留的实际反馈。 | 用户连续性是否是有用而非多余的能力。 |
| Contract 需求聚合 | 将每个需求标为单一场景或多个独立使用者共同需要。 | 哪些 API 应进入 v0.5，哪些不应进入 Core。 |

## 六、明确不做清单

v0.4 已经完成它应完成的工作。为了保护版本边界，以下内容应明确延期：

| 延期事项 | 原因 | 应进入的阶段 |
|---|---|---|
| Widget 市场、账户、云同步或付费能力 | 它们不解决 Contract 可依赖性，且会破坏 local-first 定位。 | 仅在多站点采用有证据后讨论。 |
| 一次性重写 1,700 行 Music Host | 当前最小适配已满足 Runtime 纪律；重写会稀释外部采用验证。 | v0.5+，且只由真实 Contract 缺口驱动。 |
| 公开 layout / gesture / drag / dock 服务 | 目前尚无外部采用证据说明正确 API 形态。 | v0.5 需求驱动的实验能力。 |
| 1.0 API freeze | 还未经历独立 Widget、主题和升级周期。 | v0.6–v1.0 路线。 |
| 为单一主题写 Core 特例 | 会令 Runtime 退化为主题专用脚本。 | 主题 Adapter 或外部扩展。 |

## 七、v0.4 完成状态检查表

只有下表全部满足，才应将 v0.4 从“开发中”改为“已发布”。

| 发布门槛 | 状态 | 备注 |
|---|---:|---|
| 完整 ZIP 基线无损解压 | 已满足 | 当前 ZIP 已通过完整性检查。 |
| `npm run verify` 全绿 | 已满足 | 127 个 DOM 断言与所有 check 通过。 |
| Contract、Profile、示例进入 npm pack | 已满足 | `check:pack` 已覆盖。 |
| Release commit 与 tag 可复现 | 待执行 | 当前最重要的剩余发布动作。 |
| 公开发布说明与 Alpha 边界准确 | 待执行 | 不应声称协议稳定或生态已形成。 |
| 站点/Demo 部署与发布包版本一致 | 待执行 | 需要在实际发布分支/环境复核。 |
| 观测 issue 模板与反馈入口准备好 | 建议执行 | 便于把外部反馈转为 v0.5 Contract Issue。 |

## 结论

v0.4 接下来最该做的是**发布纪律**，不是新功能开发。将完整验证基线提交、打 tag、发布包含文档和示例的包、部署一致的 Demo，并以明确的 Alpha 语言邀请外部试用。完成这些动作后，Orbit 将结束“内部架构改造”阶段，进入真正决定长期价值的外部采用阶段。

> **v0.4 的成功标准不是让更多功能运行，而是让第一批外部作者敢于开始依赖它。**

## 参考基线

[1]: ./Orbit_v0.4_半程评估.md "Orbit v0.4 半程评估（同审阅链）"
[2]: ./CONTRACT-ALPHA.md "Orbit Widget Contract Alpha"
[3]: ./PROFILE.md "Orbit Profile（0.4 Alpha）"
[4]: ../package.json "v0.4 验证与发布脚本"
