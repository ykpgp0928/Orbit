# Orbit Widget Contract Alpha（0.4 experimental）

面向 **Widget 作者**：如何用公开 Contract 把一个新 Widget 接入 Orbit Runtime，并让它获得生命周期、显隐、本地状态、portal 与 Launcher 能力——**不需要复制拖拽、吸附、手势、焦点管理代码，也不需要读 Runtime 源码**。

> 稳定性：`0.4 experimental`。核心生命周期语义（隐藏不销毁、销毁必释放、遗漏配置不等于销毁）在本版冻结；允许 0.5 发生一次可控的破坏性调整。未经真实外部使用验证前不会承诺 1.0。

---

## 1. 一分钟接入

在一个空静态页面中：

```html
<script>
  window.ORBIT = {
    launcherKey: "Alt+O",
    launcherHint: false,
    widgets: [{ id: "example-status", visible: true }]
  };
</script>
<script src="/js/orbit.js" defer></script>
<script src="/js/my-widget.js" defer></script>
<!-- 注意 defer 顺序：orbit.js 在前，你的 Widget 在后 -->
```

`my-widget.js` 只需要调用一次 `window.Orbit.register(...)`：

```js
window.Orbit.register({
  id: "example-status",
  version: "0.4",
  label: "Status 状态",
  capabilities: { launcher: true, profile: true, portal: true },
  mount(ctx) {
    // 1. 创建你的业务 DOM（自己的样式，不要写 Orbit 私有 class）
    const root = document.createElement("div");
    root.style.cssText = "position:fixed;left:140px;bottom:20px;...";
    document.body.appendChild(root);

    // 2. 副作用一律登记进 ctx.lifecycle
    const onClick = () => { /* 业务 */ };
    ctx.lifecycle.add(() => root.removeEventListener("click", onClick));
    root.addEventListener("click", onClick);

    // 3. 返回 WidgetInstance —— Runtime 接管它
    return {
      root,
      setVisible(v) { ctx.visibility.setVisible(root, v); },
      destroy() { ctx.lifecycle.dispose(); },
    };
  },
});
```

**必须遵守**：不直接操作 `window` / `document` 级全局监听（那会绕过 Runtime 的清理）；不复制 Drag/Snap/Dock 算法（v0.4 不提供，也**不需要**）；不写 Orbit 私有 CSS class（`orbit-hidden` 等由 Runtime 管理）。

---

## 2. `OrbitWidgetDefinition`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 必须匹配 `^[a-z0-9][a-z0-9._-]*$`，建议命名空间化（如 `mysite.status`）。 |
| `mount(ctx)` | function | ✅ | 创建业务 DOM 并返回 `WidgetInstance`；抛出的错误会被 Runtime 捕获并上报 `widgetError` 事件，实例保持未启动（下次 `setVisible` 自动重试）。 |
| `version` | string | 推荐 | Widget 自身版本（与 Runtime 版本无关）；缺失时 Registry 记为 `undefined`。 |
| `label` | string | 推荐 | 用户可见名称；缺失时回退为 id。**会进入 Launcher 面板 HTML，Runtime 负责转义**，但你仍应提供纯文本。 |
| `capabilities` | object | 推荐 | `{ draggable, dockable, launcher, profile, ... }`；未知字段会被安全忽略，**Registry 原样保留**供消费方检视。v0.4 只固定 `launcher`、`profile`、`portal` 语义，`draggable`/`dockable` 仅作声明预留。 |
| `defaultVisible` | boolean | 可选 | 默认 `true`；`false` 表示未列入 `ORBIT.widgets` 时默认不挂载（如 Notice）。 |

## 3. `WidgetInstance`

| 成员 | 类型 | 说明 |
|---|---|---|
| `root` | HTMLElement | 实例边界元素；`Orbit.list()` / 显隐 / destroy 都以它为准。 |
| `setVisible(bool)` | function | 可选；实现时用 `ctx.visibility.setVisible` 保持一致。不实现则 Runtime 用通用 DOM 方式处理（root + portals）。 |
| `destroy()` | function | ✅ 必填；释放业务资源（推荐只调用 `ctx.lifecycle.dispose()`）。**销毁后不得异步复活**。 |
| `portals()` | function | 可选（v0.4 推荐用 `ctx.portal.claim` 代替）。 |
| `snapshot()` | function | 可选；返回可 JSON 序列化的实例快照（v0.4 仅供调试）。 |

## 4. `ctx` 服务（v0.4 固定 5 类）

| 服务 | 能力 | 你不该用它做什么 |
|---|---|---|
| `ctx.lifecycle` | `add(fn)` 登记副作用（监听/observer/timer/rAF/媒体），`dispose()` 逆序幂等释放 | 不用于业务状态管理 |
| `ctx.visibility` | `setVisible(el, bool)`：显隐 + `aria-hidden` 协调 | 不用于销毁后偷偷保留资源 |
| `ctx.profile` | `get()` / `set(obj)` / `clear()`：按 widget id 命名空间隔离的本地 JSON | 不存 DOM、不存非 JSON 数据、不上传 |
| `ctx.portal` | `claim(el)` / `release(el)` / `list()`：body 级 sheet/menu 所有权 | 不把业务卡片冒充 portal |
| `ctx.launcher` | `open()` / `close()` / `toggle()` | 不接管 Launcher 的 UI |
| `ctx.instance` | `setVisible(bool)` / `destroy()`：请求 Runtime 管理本实例的可见性与生命周期（同步 Launcher 开关、持久化偏好） | 不用于其他 Widget |

> `layout` / `gesture` / `events` / `a11y` 是 v0.4 之后的候选服务，本版不作为必选面。

## 5. Runtime 语义（已冻结）

- **隐藏 ≠ 销毁**：`Orbit.setVisible(id, false)` 只隐藏（含 portal），实例与资源保留。
- **销毁必释放**：`Orbit.destroy(id)` 调 `instance.destroy()` → `ctx.lifecycle.dispose()` → 移除 root 与已 claim 的 portal。
- **遗漏配置 ≠ 销毁**：`ORBIT.widgets` 省略某个已挂载 id **不会**销毁它。
- **Launcher 元数据驱动**：面板标签、排序、显隐开关全部来自注册元数据；Runtime 不硬编码任何 widget id。

## 6. 完整走查示例

见仓库 [`examples/reference-widget/badge.js`](../examples/reference-widget/badge.js)（一个"外部作者视角"的 Status Badge：注册、profile 读写、portal claim、显隐、销毁、重挂载全链路）。它的接入页就是 `tests/contract-test.html` 那样的空静态页面，且自动化断言在 `tests/contract.test.mjs` 中（`npm run test:dom`）。

## 7. 已知限制（0.4 experimental）

- 拖拽 / 磁吸 / 停靠服务尚未作为 Contract 能力开放（`capabilities.draggable` 只声明、不保证）。
- Profile 为**每 Widget 命名空间**的本地存储；跨 Widget 的全局 Profile 导入/导出在 Milestone 4 引入，schema 可能变化。
- 挂载时机：`register()` 应在页面脚本中调用（Runtime 的 `mount()` 在 DOMContentLoaded 时读取 `ORBIT.widgets`）。动态注册后调用 `Orbit.mount({ widgets: [...] })` 即可启动。
