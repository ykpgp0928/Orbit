# 迁移指南：0.2 → 0.3

面向 **主题维护者** 与 **Host 维护者**：从 Orbit 0.2 升级到 0.3 需要知道什么。

## 一、对主题维护者：无需改动即可升级

0.3 保持 0.2 的全部公开配置与接入方式：

- `window.ORBIT`（`launcherKey` / `launcherHint` / `widgets`）字段不变；
- `window.FWF_MUSIC`（Meting 音源约定）字段不变；
- 引入方式不变：`dist/orbit.js`（多 Widget）或 `floating-widget-music.js` / `floating-widget-clock.js`（单 Widget），**不要**同时引入 `orbit.js` 与单 Widget 包。

唯一可感知的变化是新增能力：**显式销毁**与**幽灵恢复入口**（全部隐藏时出现 ◎ 图标可重新打开面板）。

## 二、语义变化：隐藏 ≠ 销毁

0.2 中「从配置里去掉某个 id」会被理解为隐藏。0.3 起：

| 动作 | 语义 | API |
|---|---|---|
| 隐藏 | 保留实例与资源，仅隐藏 DOM | `Orbit.setVisible(id, false)` |
| 显示 | 恢复显示（未启动则启动） | `Orbit.setVisible(id, true)` |
| 销毁 | 释放全部资源、移除 DOM | `Orbit.destroy(id)` |
| 配置省略 | **不销毁**已挂载实例 | `ORBIT.widgets` 只更新列出的 id |

## 三、对 Host 维护者：可选的适配器增强

`Orbit.registerHost(id, { start })` 仍兼容。0.3 起推荐补齐：

```js
Orbit.registerHost("music", {
  start: startMusicPlayer,
  getRoot: () => document.getElementById("music-player"),
  destroy: destroyMusicPlayer,                // 可选：显式销毁时调用
  getVisibilityTargets: () => [root, portal], // 可选：显隐时一起处理的节点
});
```

- `destroy` 存在时 `Orbit.destroy(id)` 会调用它做资源收口；缺失则回退为仅移除 root。
- `getVisibilityTargets` 用于把 body 级 portal（如歌单 sheet）纳入显隐过渡。

## 四、新资源约定

- 有资源就有 cleanup：监听、timer、rAF、observer 应可逆序、幂等释放（`LifecycleScope`）。
- `mount` 幂等；重复调用不会双启动。
- 移动端长按悬浮球（约 0.5s、少滑动）打开 Launcher；`launcherFallback: "ghost"` 提供全隐藏后的恢复入口。

## 五、参考

- [API.md](./API.md) · [CONFIG.md](./CONFIG.md) · [DEVELOPMENT.md](./DEVELOPMENT.md)
- [CHANGELOG.md](../CHANGELOG.md) 0.3.0 条目
- 0.3 迭代记录：[v0.3-iteration.md](./history/v0.3-iteration.md)
