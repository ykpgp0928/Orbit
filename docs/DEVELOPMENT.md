# Orbit 开发与第三方 Widget（0.4）

面向 **二次开发者**。站长接入请看 [README](../README.md) / [CONFIG.md](./CONFIG.md)；外部作者 Contract 请看 [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md)。

---

## 仓库脚本

```bash
npm run build          # → dist/
npm test               # 单元 + normalize
npm run test:dom       # Playwright DOM 回归（需 playwright-core + chromium）
npm run verify         # build + test + test:dom + dist/links/version/pack
npm run ci             # = verify
npm run prepare-site   # 静态站 site/
```

本地若缺少浏览器依赖：

```bash
npm install
npx playwright-core install chromium
```

---

## 生产路径：Contract `Orbit.register`

0.4 起官方三个组件均走 **Widget Contract**（`entry-orbit.js` 内 `register`）。第三方请使用同一路径，**不要**再依赖已淡出的 `registerHost` 生产写法。

```js
window.Orbit.register({
  id: "mysite.hello",
  version: "0.1",
  label: "Hello",
  capabilities: { launcher: true, profile: true },
  mount(ctx) {
    const root = document.createElement("div");
    root.textContent = "Hello";
    root.style.cssText = "position:fixed;left:20px;bottom:80px;z-index:99990";
    document.body.appendChild(root);

    ctx.lifecycle.add(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
    });

    return {
      root: root,
      setVisible: function (v) {
        ctx.visibility.setVisible(root, !!v);
      },
      destroy: function () {
        ctx.lifecycle.dispose();
      },
    };
  },
});
```

站长侧须在 `ORBIT.widgets` 中声明该 `id`，Launcher 才会出现对应开关（除非 `launcherShowAll: true`）。

约定：

- 有资源就有 **cleanup**（`ctx.lifecycle`）
- 隐藏走 `setVisible`，卸载走 `destroy`
- 不在业务里写死 Runtime 私有 class / 全局匿名监听

完整服务列表见 [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md)。参考实现：`examples/reference-widget/`。

---

## 目录

| 路径 | 含义 |
|------|------|
| `src/core/` | Orbit、Launcher、LifecycleScope、Registry |
| `src/interaction/` | Gesture … ExpandPolicy |
| `src/host/` | **Music**、**Clock** 宿主（Music 业务主实现在此） |
| `src/widgets/notice/` | Notice Contract Widget |
| `src/widgets/music/` | 空目录占位；勿在此寻找 Music 业务源码 |
| `src/entry-*.js` | 打包入口（`entry-orbit.js` 注册三个官方定义） |
| `examples/` | 外部作者参考 |
| `tests/` | 单元与 DOM |
| `docs/plans/` | 版本方案 |
| `docs/history/` | 历史阶段记录 |

---

## 官方 Widget 实现位置（避免迷路）

| Widget | 定义与主逻辑 |
|--------|----------------|
| Music | `src/host/music-player-host.js` → `musicWidgetDefinition`（最小 Contract 包装） |
| Clock | `src/host/clock-host.js` → `clockWidgetDefinition` |
| Notice | `src/widgets/notice/NoticeWidget.js` → `noticeWidgetDefinition` |

Music 全量拆进纯 Contract 目录属后续版本（见 v0.5 方案），不是文档遗漏。

---

## 禁止

- 跳过 destroy / 连续 remount 验证直接大改手势与壳层  
- 默认全页长按抢手势  
- 未测量就用纯 scale 动画替代布局几何  
- 第三方 Widget `import` 仓库 `src/` 私有模块冒充「外部接入」  
- 用官方未列入 `widgets` 的注册项假设「用户一定能在 Launcher 看到」
