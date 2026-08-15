# Orbit 开发与第三方 Widget（0.3）

## 仓库脚本

```bash
npm run build          # dist/
npm run test:unit
npm run ci
npm run prepare-site   # 静态站 site/
```

## 最小 Widget 定义（概念）

```js
import { registerWidget } from "./core/WidgetRegistry.js";
import { createLifecycleScope } from "./core/LifecycleScope.js";

registerWidget("hello", {
  label: "Hello",
  mount(ctx) {
    const scope = createLifecycleScope();
    const el = document.createElement("div");
    el.textContent = "Hello";
    document.body.appendChild(el);
    scope.add(() => el.remove());

    return {
      root: el,
      destroy() {
        scope.dispose();
      },
    };
  },
});
```

当前生产路径仍以 **Host + `Orbit.registerHost`** 为主（Music / Clock）。v0.3 要求：

- 有资源就有 **cleanup / destroy**
- 隐藏走 `setVisible`，卸载走 `destroy`
- 不要在 Runtime 里写死业务 DOM id

## 目录

| 路径 | 含义 |
|------|------|
| `src/core/` | Orbit、Launcher、LifecycleScope、Registry |
| `src/interaction/` | Gesture…ExpandPolicy |
| `src/host/` | Music / Clock 宿主 |
| `src/entry-*.js` | 打包入口 |

## 禁止（0.3 约定）

- 为省事跳过 Clock 试点式的 destroy 验证直接大改 Music 手势  
- 默认全页长按抢手势  
- 未测量就全面改成 scale 动画替代布局几何  
