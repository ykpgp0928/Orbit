# Orbit 外部试点说明（v0.5）

Orbit 是面向静态站的悬浮组件 Runtime（音乐 / 时钟 / 公告等），不依赖 React/Vue。  
当前版本为 **Contract Alpha（0.4）**：核心生命周期已加固，接口仍可能在 v0.5 做一次受控调整。

我们征集两类帮助（任选其一即可）：

1. **站点 / 主题**：在你的 Hexo 或其他静态站挂上官方组件，反馈拖拽、手机长按、PJAX、样式冲突等问题。
2. **Widget 作者**：只使用公开 API 与文档，做一个小组件（如公告、进度），看文档是否够用。

**说明：** 可选、可随时卸载；数据仅存浏览器本地，无账号无上传。反馈请用 GitHub Issue（请选择对应模板并带上标签）。

| 资源 | 链接 |
|------|------|
| 在线 Demo | https://orbit.ykpgp0928.dpdns.org/demo |
| 仓库 | https://github.com/ykpgp0928/Orbit |
| Contract 文档 | [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md) |
| 参考 Widget | [examples/reference-widget](../examples/reference-widget) |

## 如何反馈

在仓库 **Issues → New issue** 中选择：

| 模板 | 适用 |
|------|------|
| 主题 / 站点试点反馈 | 把 Orbit 挂进博客或主题之后 |
| 外部 Widget 接入反馈 | 自己写 Widget、只靠公开 API |
| Contract Alpha / Runtime 问题 | 生命周期、Profile、Portal 等契约行为 |

## 最小接入（Hexo 示例）

```yaml
# 主题 inject 示例（路径按你的主题调整）
inject:
  head:
    - <link rel="stylesheet" href="/css/floating-widget-music.css">
    - <link rel="stylesheet" href="/css/floating-widget-clock.css">
  bottom:
    - <script>window.FWF_MUSIC={server:"netease",type:"playlist",id:"你的歌单ID"}</script>
    - <script>window.ORBIT={launcherKey:"Alt+O",widgets:[{id:"music",visible:true},{id:"clock",visible:true}]}</script>
    - <script src="/js/orbit.js" defer></script>
```

将 `dist/` 中对应文件拷入主题的 `source/js`、`source/css` 即可。单组件时不要与 `orbit.js` 同时引入独立入口。更多见 [README](../README.md) 与 [API.md](./API.md)。
