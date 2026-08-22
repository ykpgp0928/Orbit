# Orbit 外部试点说明（v0.5）

Orbit 是面向静态站的悬浮组件 Runtime（音乐 / 时钟 / 公告等），不依赖 React / Vue。  
当前发布线为 **0.4.0 · Contract Alpha**：核心生命周期、显隐语义、Profile 与质量门禁已落地；接口在 v0.5 仍可能做一次**受控**调整。

我们征集两类帮助（任选其一即可）：

1. **站点 / 主题**：在真实 Hexo 或其他静态站挂上官方组件，反馈拖拽、手机长按、PJAX、主题样式 / z-index 冲突等。
2. **Widget 作者**：只使用公开 API 与文档（不要 `import` 仓库 `src/`），做一个小组件，看文档是否够用。

**说明：** 完全可选，随时可卸载；数据默认只在浏览器本地，无账号、无上传。反馈请用 GitHub Issue（选择对应模板）。

| 资源 | 链接 |
|------|------|
| 在线 Demo | https://orbit.ykpgp0928.dpdns.org/demo |
| 仓库 | https://github.com/ykpgp0928/Orbit |
| 配置说明 | [CONFIG.md](./CONFIG.md) |
| Contract | [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md) |
| 参考 Widget | [examples/reference-widget](../examples/reference-widget) |

## 如何反馈

**Issues → New issue**，选择：

| 模板 | 适用 |
|------|------|
| 主题 / 站点试点反馈 | 把 Orbit 挂进博客或主题之后 |
| 外部 Widget 接入反馈 | 自己写 Widget、只靠公开 API |
| Contract Alpha / Runtime 问题 | 生命周期、Profile、Portal 等契约行为 |

## 最小接入（Hexo）

```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/floating-widget-music.css">
    - <link rel="stylesheet" href="/css/floating-widget-clock.css">
  bottom:
    - <script>window.FWF_MUSIC={server:"netease",type:"playlist",id:"你的歌单ID"}</script>
    - <script>window.ORBIT={launcherKey:"Alt+O",widgets:[{id:"music",visible:true},{id:"clock",visible:true}]}</script>
    - <script src="/js/orbit.js" defer></script>
```

将 `dist/` 中文件拷入主题 `source/js`、`source/css`。  
单组件场景不要与 `orbit.js` 同时引入独立入口。  

**Launcher：** 默认只显示 `widgets` 里声明的组件。需要公告时把 `{ id: "notice", visible: true }` 写入 `widgets`，并配置 `notice` 与 CSS。详见 [CONFIG.md](./CONFIG.md)。

更多： [README](../README.md) · [API.md](./API.md)
