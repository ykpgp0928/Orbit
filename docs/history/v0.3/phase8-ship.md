# Phase 8 — Ship

**Status:** documentation & build ready  
**Version:** **0.3.0**

## Checklist

| 项 | 状态 |
|----|------|
| `package.json` version `0.3.0` | ✅ |
| CHANGELOG | ✅ |
| MIGRATION-v0.3 / DEVELOPMENT | ✅ |
| `npm run ci` | 请本机再跑一次确认 |
| `npm run prepare-site` | 发布 Demo 前执行 |
| Git tag `v0.3.0` | ☐ 本机 |
| GitHub Release | ☐ 本机 |
| 静态 Demo 部署 | ☐ 本机 |
| npm publish | ☐ **可选** |

## 本机发布命令

```bash
npm run ci
npm run prepare-site
git add -A
git commit -m "release: Orbit v0.3.0"
git tag -a v0.3.0 -m "Orbit v0.3.0"
git push origin main
git push origin v0.3.0
# 可选: npm publish --otp=...
```

Cloudflare 等：Build `npm run prepare-site`，输出目录 **`site`**。
