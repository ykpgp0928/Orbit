# Phase 6 — Test & CI

**Status:** done  
**npm publish:** still optional (does not block v0.3)

## Scripts

| Command | What |
|---------|------|
| `npm run test:unit` | LifecycleScope、WidgetRegistry、ExpandPolicy |
| `npm run test:normalize` | State.normalize smoke |
| `npm run test` | unit + normalize |
| `npm run check:dist` | dist/ 五件套存在且非空 |
| `npm run ci` | build + test:unit + check:dist |

`site/dist` 过期仅 **WARN**（`npm run prepare-site` 同步）。设 `FORCE_SITE_SYNC=1` 才对 site 硬失败。

## CI

`.github/workflows/ci.yml`：Node 20 → build → unit → check:dist

## Intentionally not in Phase 6

- Playwright E2E（可 RC 再加）
- npm publish

## Counts

本地：`14` unit tests pass（Scope 5 + Registry 3 + ExpandPolicy 6）
