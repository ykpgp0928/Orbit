# Orbit v0.4 半程评估：方向正确，架构已破题，但尚不能发布

**审阅对象：** 用户提供的 v0.4 开发中代码包  
**对照基线：** 《Orbit v0.4 方案：从高质量实现到可依赖的悬浮交互 Runtime》  
**审阅日期：** 2026-08-21  
**结论等级：** **继续推进；暂不发布；优先完成一致性与可验证性收口。**

## 一、执行摘要

这份代码包证明 Orbit v0.4 已经跨过最关键的概念门槛：项目不再只是把 Music 和 Clock 放进同一个 Launcher，而是已经拥有一条实际可运行的 **Widget Contract Alpha** 路径。`Orbit.register(definition)` 能将公开 Definition 桥接到现有 Runtime 实例管理；Clock 与新的 Notice 已通过该路径接入；Launcher 标签由元数据驱动并进行了 HTML 转义；Reference Widget 和浏览器级 Contract 回归测试也已经出现。换言之，Orbit 已从“内部 Host 协作”进入“可供外部作者尝试的 Runtime”阶段。

不过，作者对“v0.4 执行到一半”的判断是准确的。按原方案的发布定义估算，本版本完成度约为 **60–65%**：M0 基本完成，M1 和 M2 已有实质成果，M3 仅完成 Clock/Notice 的迁移与 Music 的薄适配，M4（可移植 Profile）尚未开始。更重要的是，当前遗留的不是单纯的体验优化，而是若干会削弱“第三方可安全依赖”承诺的一致性问题：异步销毁边界、拖拽中销毁、挂载失败状态、Profile/配置语义、发布包内容和完整 DOM 回归均需收口。

> **目前 Orbit 已具备“架构原型”的说服力，但还不具备“可发布的 Contract Alpha”的证据强度。**

## 二、与 v0.4 原方案的对照

| 里程碑 | 原方案的验收重点 | 当前状态 | 评价 |
|---|---|---:|---|
| M0：基线冻结与版本契约 | 单一版本源、链接校验、本地与 CI 使用同一 verify 入口。 | **大体完成** | `check-version`、`check-links`、`verify` 和 CI 浏览器安装已经落地。归档中 `version.js` 解压为 0 字节，无法据此判断作者源文件；脚本本身设计正确。 |
| M1：Lifecycle Hardening | Music/Clock 连续 destroy/remount，无监听、portal、音频或异步复活残留。 | **约 70%** | Music 已大量把匿名监听收进 LifecycleScope，清理 observer、PJAX、rAF、timer 和单例状态；但 fetch 取消、拖拽中销毁和部分 timer/rAF 仍缺完整闭环。 |
| M2：Contract Alpha | 外部作者不读内部代码即可 register/mount/profile/portal/visibility/destroy。 | **约 80%** | Contract Adapter、ctx 服务、Reference Widget、文档和 Contract DOM 测试都已存在。Schema 强制和失败状态处理仍偏弱。 |
| M3：首批 Host 迁移与异质样本 | Music、Clock 和第三种 Widget 使用同一管理语义；Launcher 不硬编码。 | **约 55%** | Clock 与 Notice 为真正 Contract 样本；Music 仍是“最小适配层”，未使用 Contract Profile/Lifecycle/Portal 作为唯一边界。 |
| M4：Profile Alpha 与可移植性 | 有 schema、导出/导入、容错与 local-first 说明。 | **约 15%** | 已有按 id 命名空间的 localStorage Profile 和 visibility 偏好，但没有聚合 Profile、schema、导出/导入或损坏数据恢复策略。 |
| 质量与发布 | Unit + DOM + dist + links + version + package 完整通过。 | **约 50%** | 本地 unit/normalize 通过；本审阅环境无法启动 Playwright 缓存浏览器，且归档有部分文件解压失败。`npm pack --dry-run` 表明 Contract 文档与 examples 未被纳入发布包。 |

## 三、已经完成且值得肯定的工作

### 3.1 Contract 已从概念变成真实的 Runtime 路径

`src/core/Orbit.js` 中的 `register()` 不再只是登记元数据，而是将 Definition 包装为 Contract Adapter，复用经验证的 `start / getRoot / destroy / visibility / launcher` 实例路径。ctx 已提供 lifecycle、visibility、profile、portal、launcher 与 instance 服务；Runtime 也能清理 claimed portal，并为 body 替换提供 Root 恢复。这是 v0.4 最重要的工程进展。

Reference Widget 也没有偷用私有实现。它通过公开 `window.Orbit.register(...)` 接入，并使用 Profile、Portal、显隐和 destroy；`tests/contract.test.mjs` 进一步验证 metadata 驱动 Launcher、XSS 转义、hide 不等于 destroy、两轮 destroy/remount 和监听不增长。这一链路已开始回答 Orbit 的核心问题：**第三方 Widget 是否能够成为 Runtime 的一等公民。**

### 3.2 第一方入口开始去业务硬编码

`src/entry-orbit.js` 已统一注册 Music、Clock、Notice；Launcher 使用 `getLabel()` 而非 `music/clock` 常量映射，且 label/id 均经过转义。Notice 则是一个合格的异质样本：它不用音频、时间或复杂拖拽逻辑，却能使用 ctx.lifecycle、ctx.profile、ctx.visibility 与 ctx.instance 完成关闭、状态同步和销毁。

这一点比“多加一个公告组件”更重要。它说明 Runtime 已经能够服务不同业务形态，而不是 Music Host 的专用外壳。

### 3.3 质量意识明显上升

Music Host 最危险的匿名监听、PJAX 复活、ghost-click 全局标志和部分 media cleanup 已得到系统性治理。CI 也不再只跑纯函数单测，而是准备安装 Chromium 后运行统一的 `npm run verify`。版本和链接检查脚本将此前文档/产物口径漂移转成了自动化门禁。

这正是 v0.4 应该做的工作：先让 Runtime 的资源所有权与发布链路可信，再讨论更大范围的生态。

## 四、尚未收口的发布阻断项

下列问题不是“可以以后优化”的愿望单，而是 v0.4 若要作为 Contract Alpha 发布，应优先关闭的风险。

| 优先级 | 问题 | 代码/证据 | 风险 | 建议验收方式 |
|---|---|---|---|---|
| P0 | **完整 verify 尚无可复核绿灯** | 审阅环境的 `npm run verify` 在 DOM 阶段因缺少 Playwright 缓存浏览器停止；归档中三份 DOM 相关文件未完整解压。 | 无法确认 94 项声称的浏览器断言在当前半成品上真实通过。 | 在干净 Linux CI 与本地环境运行完整 verify，保存机器可读的结果与失败截图/日志。 |
| P0 | **Profile Alpha 未完成可移植性** | 当前只有 `orbit-profile:<id>` 与 `orbit-visible-v1` 的局部存储。 | 仍没有用户层连续性；无法满足原方案中的导出/导入验收。 | 实现 `Orbit.exportProfile()` / `Orbit.importProfile()`、schema 版本、未知 Widget 忽略和单项损坏容错。 |
| P1 | **Music destroy 未取消进行中的异步加载** | `fetchPlaylist()` 无 AbortController；`init()` 的 await 返回后没有 `alive` / generation guard。 | destroy 后请求仍可能 `renderList()`、`loadSong()` 或创建/触碰已销毁实例。 | 建立 per-mount AbortController 与 generation token；添加“fetch 未完成时 destroy”DOM 回归。 |
| P1 | **Clock / Music 的 active-drag destroy 未完全清理 document pointer 监听** | pointermove/up/cancel 在 `endDragSession()` 中移除；destroy 路径没有先终止会话。 | 用户拖拽时销毁可能留下 document 监听与 pointer capture。 | 为两个 Host 添加“pointerdown → drag → destroy → listener net 为零”的断言。 |
| P1 | **mount 失败会形成假 started 状态** | Contract Adapter 捕获 mount 异常；`ensureStarted()` 仍把实例标记为 `started=true`。 | Launcher / API 可能报告实例已启动，但实际没有 root；可见性会无效重试。 | 让 adapter.start 返回 success/instance，或读取 `getRoot()` 后再标记 started；增加 mount throw 回归。 |
| P1 | **配置、偏好和 destroy 语义不一致** | Orbit 注释称 destroy 会清 visibility preference，但实现没有删除该 key；`options.forget` 未使用。 | 调用者无法预测 destroy/remount 后使用配置默认值还是历史偏好。 | 明确默认语义；实现 `forget` 或移除声明；写出三种情形的测试。 |
| P1 | **Notice 默认行为的文档与 Runtime 不一致** | `defaultWidgets()` 会把所有 Host 默认启动；README 却称 Notice 必须显式加入 `ORBIT.widgets`。 | 用户会看到与文档相反的 Widget 启动结果。 | 选择其一：默认列表只含 Music/Clock，或修改 README 并写缺省配置回归。 |
| P1 | **npm 包未携带 Contract 入门材料** | `npm pack --dry-run` 的 15 个文件中没有 `docs/CONTRACT-ALPHA.md`、`examples/` 或 `MIGRATION-v0.3.md`。 | 通过 npm 接入的开发者拿不到公开扩展契约和可运行示例。 | 更新 `package.json.files`，再把 `npm pack --dry-run` 加入 `verify`。 |
| P2 | **PJAX 恢复只保证 Root，不保证 claimed portal** | Runtime body recovery 重新 append Root，但未恢复因 body swap 脱离的 portal。 | 根组件恢复而底层 sheet/menu 丢失，尤其影响 Music。 | 增加 body-replace 回归，重新挂接或显式重建已 claim portal。 |
| P2 | **Contract 约束与实现强制程度不同** | 文档把 version/label 写为必填；Registry 实际只校验 id 与 mount，且保存时丢弃 capabilities。 | Alpha API 的可信边界不够明确，未来难以兼容协商。 | 要么校验并保留 version/label/capabilities，要么将文档改为“推荐字段”。 |

## 五、需要调整的认识：Music 不能被算作“已完整迁移”

当前 `musicWidgetDefinition` 的注释已经诚实说明它是 **minimal adapter layer**，这比伪装为完整迁移要好。但在 v0.4 的进度计算中，它只能算作“接入 Runtime 生命周期与门户汇报”，不能算作“已通过 Contract 获得同一组服务”。Music 的位置、业务状态和异步资源仍主要由 legacy module state 与 `mp-state-v3` 管理；`mount()` 也不接收 ctx。

因此，建议不要为了表面上的“三个 Widget 已迁移”而将 Music 过早重写。更稳妥的 v0.4 收口是：**先确保 Music 的 legacy adapter 完全满足 destroy/remount 纪律；在文档中将其标为兼容适配；把真正的 service-first Music 迁移留给 v0.5。** 这与 Contract Alpha 的实验性定位一致，也避免 v0.4 被 1,690 行 Music Host 的重构吞没。

## 六、建议的收口顺序

### 收口批次 A：先让语义只有一个答案

首先修复 destroy/visibility preference、Notice 默认注册、dismiss 叙述、Contract 的必填字段约束和发布包文件清单。这些工作代码量不大，但会避免 Runtime、README、CHANGELOG 与测试互相矛盾。完成后，使用“配置默认值、用户主动切换、destroy、remount”四种路径写成一张可执行状态表。

### 收口批次 B：把 M1 变成可证明的资源纪律

其次补上异步请求取消、active drag 销毁、Portal 恢复和 mount failure 四类回归。重点不是继续人工审查 1,690 行 Music Host，而是让每一个已知危险边界都有自动化测试：请求途中 destroy、指针会话途中 destroy、PJAX body 替换、mount 抛错、连续三轮 remount。

### 收口批次 C：完成真正的 Profile Alpha 和 npm 交付闭环

最后做一个很小但完整的 Profile envelope。它不需要同步服务：仅需 Runtime 级可见性、每 Widget JSON state、schema 版本、导出、导入、未知 Widget 忽略和单条损坏容错。然后把 Contract 文档、Reference Widget、Migration 与发布包检查带入 `npm pack --dry-run`。

完成这三批后，v0.4 才能较有把握地满足“第三方作者可以依赖”的 Alpha 门槛。

## 七、对 v1.0 路线的影响

这份半成品的最大积极信号，是 Orbit 已经开始积累 v1.0 所需的第一层兼容性资产：Definition、实例生命周期、metadata、Profile namespace、Portal 所有权与公开示例。它并未解决不可替代性——因为 Reference Widget 仍由核心仓库维护，尚无独立采用者——但已经补齐了 v0.5 开始进行外部验证的必要前提。

v1.0 路线不应因此加速 API freeze。正确顺序仍然是：**v0.4 关闭上述资源/语义/交付阻断项 → v0.5 让独立 Widget 作者和主题作者接入 → 用真实迁移反馈收敛 Contract → 再讨论稳定协议。**

## 八、审阅局限

此 RAR v5 文件在审阅环境中发生部分提取失败：`src/core/version.js`、`tests/lifecycle.test.mjs`、`tests/three-widget.test.mjs`、`tests/contract-test.html` 等文件呈现为 0 字节；另一解包引擎则报告不支持其压缩方法。因此，本报告没有将这些缺失文件视为作者缺陷。

同样，`npm run verify` 已成功运行 build、14 项 Node 单测与 state normalize smoke checks，但在 DOM 测试启动阶段因本环境缺少 Playwright 缓存 Chromium 停止。CI 配置已显式安装 Chromium，故不能据此判断 CI 必然失败。正式发布前仍应在 CI 上取得完整绿灯，并用一个普通 ZIP 或 Git commit 提供可复现审阅基线。

## 结论

**v0.4 的路线没有跑偏。** Contract Alpha、异质 Widget、统一 Launcher、Lifecycle 收口和 CI 门禁共同表明，Orbit 正在从“高质量的官方悬浮组件实现”转向“可承载外部 Widget 的交互 Runtime”。这正是提高长期不可替代性所需要的方向。

但此刻最有价值的克制不是再添加新 Widget，而是把现有的 Alpha 承诺变成可验证事实。只要 v0.4 关闭异步销毁、交互中销毁、Profile 可移植、文档/配置一致性和发布包完整性五类缺口，它就可以作为一次可信的架构版本发布；否则，它仍应保持开发中状态，而不应为了版本号提前宣布完成。

---

## 本地审阅证据索引

| 主题 | 主要证据文件 |
|---|---|
| Contract Adapter、Profile、Visibility、Portal、Body Recovery | `src/core/Orbit.js` |
| Metadata Launcher 与 XSS 转义 | `src/core/Launcher.js` |
| Music 生命周期、异步与资源边界 | `src/host/music-player-host.js` |
| Clock Contract 迁移与拖拽会话 | `src/host/clock-host.js` |
| 异质 Contract 示例 | `src/widgets/notice/NoticeWidget.js` |
| Contract API 与已知限制 | `docs/CONTRACT-ALPHA.md` |
| 版本进度自述 | `CHANGELOG.md` |
| Contract 浏览器回归 | `tests/contract.test.mjs`、`tests/_helpers.mjs` |
| CI 门禁 | `.github/workflows/ci.yml`、`package.json` |
| 发布包范围 | `package.json`、`npm pack --dry-run` 输出 |

**建议后续审阅基线：** 使用当前工作区的 Git commit 或无损 ZIP 重新提交，而非该 RAR，以便完整执行 DOM 测试和版本检查。
