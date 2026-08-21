# Orbit 安全注记（部署者向）

面向把 Orbit 部署到自己的静态站/主题的维护者。回答：外部音源、CSP、动态文本、第三方 Widget 的边界。

## 1. 外部音源（Music）

Music Widget 默认通过公共 Meting 兼容 API 拉取歌单：

- `https://api.injahow.cn/meting/…`
- `https://meting.mikus.ink/api…`
- `https://api.i-meto.com/meting/api…`

风险与对策：

- 这些是**第三方公共服务**：可用性不受控，可能失效、限流或返回异常数据。失效时 Music 显示"加载失败"，其余 Widget 不受影响。
- 若你的站点可自建音源，可在 `window.FWF_MUSIC` 中配置自己的 server/type/id；或替换 `dist` 中的 `CONFIG.apis`（需自建构建）。
- **不要**把第三方 API 返回的 URL 当作可信 HTML 插入——本组件只用 `textContent` 渲染名称/歌手，但你自己写的渲染逻辑应同样遵守。

## 2. CSP（Content-Security-Policy）

最小建议（按需放宽）：

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com;
  font-src 'self' https://cdnjs.cloudflare.com data:;
  img-src 'self' data: https:;
  media-src https:;
  connect-src 'self' https://api.injahow.cn https://meting.mikus.ink https://api.i-meto.com;
```

| 指令 | 为什么需要 |
|---|---|
| `style-src 'unsafe-inline'` | Orbit 通过 `<style>` 注入运行时样式（Launcher、显隐原语），Music/Notice 使用内联样式 |
| `media-src https:` | 音频流来自第三方音源 |
| `connect-src …` | Music 拉取歌单的 fetch；不需要时可删除对应源 |
| `font-src cdnjs` | demo 使用 Font Awesome；生产可自托管图标 |

如果不想允许任何外部 `connect-src`，可禁用 Music（不配置 `window.FWF_MUSIC`）或自建音源。

## 3. 动态文本与 XSS

- **Widget label**：进入 Launcher 面板 HTML，Runtime 会转义（`escapeHtml`）。但你仍应提供纯文本 label。
- **Notice 文本**：`window.ORBIT.notice.title/text` 以 `textContent` 渲染，不会执行 HTML。不要把用户输入直接拼接进你自己的模板。
- **第三方 Widget**：任何 Widget 的 `mount(ctx)` 都运行在页面主线程，拥有页面同等的 DOM 权限——**只有在你信任其来源时才引入**。Orbit 不提供远程 Widget 执行机制（v0.5 也不计划）。

## 4. 第三方 Widget 的边界

- Widget 只能通过公开 `Orbit.register` / `ctx` 服务与 Runtime 交互；不提供沙箱或权限模型（v0.4 明确非目标）。
- 引入前检查：是否 import `src/`（依赖内部实现）、是否写 `window`/`document` 全局监听（绕过生命周期清理）、是否自带远程脚本。
- 站点公告等 Widget 的关闭/显隐状态存于 `localStorage`（`orbit-profile:*`、`orbit-visible-v1`），仅本地、可清除。

## 5. 已知非目标

- 无账户、无云同步、无遥测、无远程执行——Profile 数据只留在浏览器，导出由用户主动触发。
- 部署者若发现某个主题需要特殊修补才能工作，请以 issue 提交（标签 `theme-adapter`），不要期待 Core 写入特定主题选择器。
