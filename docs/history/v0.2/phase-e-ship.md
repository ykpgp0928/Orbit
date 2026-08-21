# Phase E — Ship checklist

**Status:** done  
**Runtime:** `0.2.0-c`（Launcher 移动端脚注已适配）

## 发布前检查

- [x] `npm run build` 产出 music / clock / orbit  
- [x] `npm run prepare-site` 产出干净 `site/`（无 node_modules）  
- [x] Demo：`/`、`/demo/`、`/test-dist.html`、`/test-clock.html`  
- [x] 桌面：`Alt+O` 开面板；Esc / 遮罩关闭  
- [x] 移动：长按球开面板；脚注为「长按… / 点遮罩关闭」而非 Alt+O  
- [x] 文档：README、API、CONFIG、CHANGELOG  

## Cloudflare / 静态托管

| 项 | 值 |
|----|-----|
| Build command | `npm run prepare-site` |
| Output directory | `site` |
| 勿用 | 整仓根目录当 assets（会带上 node_modules） |

## npm（可选）

见 `docs/PUBLISH.md`。包内以 `dist/` 为主。

## 入口对照

| 场景 | 脚本 |
|------|------|
| 多 Widget | `orbit.js` + 两个 css |
| 仅 Music | `floating-widget-music.js` + css |
| 仅 Clock | `floating-widget-clock.js` + css |
