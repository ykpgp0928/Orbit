# Phase 0 — v0.3 Freeze（基线冻结）

**状态：** 文档冻结完成（本环境无 git，**tag 需在你本机仓库打**）  
**冻结日期：** 2026-08-15  
**产品版本基线：** Orbit **v0.2.0** / runtime 标记 `0.2.0-c`  
**下一阶段：** Phase 1 — LifecycleScope + `test:unit`

---

## 1. 你必须在本机执行的 Git 动作

本沙箱 **不是 git 仓库**。请在你的 GitHub 克隆目录：

```bash
git status
git add -A
git commit -m "chore: freeze v0.2 baseline before v0.3 (mobile expand fit)"
# 若已有未推送提交，确保与线上一致后再打 tag

git rev-parse HEAD
# 将输出的 SHA 填回本文「Commit SHA」一节并再提交一次文档（可选）

git tag -a v0.2-baseline -m "Orbit v0.2 baseline before v0.3 lifecycle work"
git push origin main
git push origin v0.2-baseline
```

| 项 | 值 |
|----|-----|
| **建议 tag** | `v0.2-baseline` |
| **Commit SHA** | _（本机 `git rev-parse HEAD` 后填入）_ |

---

## 2. 构建产物（`npm run build`，2026-08-15）

| 文件 | 字节 | SHA-256 |
|------|------|---------|
| `dist/orbit.js` | 125464 | `1724712eb3eef64f0bf27f132961078df118c111cf80d623e0c755bf08ebde63` |
| `dist/floating-widget-music.js` | 83776 | `3cc471e10f00fa2635a0f3ccecdbb1b2899c1283d42da772642e58622d4ab649` |
| `dist/floating-widget-music.css` | 33758 | `8fa1af4dc3d142e9208da64da6a9a2b65101f3a62980defac81250abb9a3bb80` |
| `dist/floating-widget-clock.js` | 36188 | `44a7faf1335f3aa6f75836ef4a5432c5e5d1e097ce75196329def6d96cc0db10` |
| `dist/floating-widget-clock.css` | 3028 | `f03cf949dd54dfe1b266aba2ca33527ba39dc3bd522cbcdd0b5ef4f448071ea3` |

校验（本机）：

```bash
cd dist
sha256sum -c <<'EOF'
1724712eb3eef64f0bf27f132961078df118c111cf80d623e0c755bf08ebde63  orbit.js
3cc471e10f00fa2635a0f3ccecdbb1b2899c1283d42da772642e58622d4ab649  floating-widget-music.js
8fa1af4dc3d142e9208da64da6a9a2b65101f3a62980defac81250abb9a3bb80  floating-widget-music.css
44a7faf1335f3aa6f75836ef4a5432c5e5d1e097ce75196329def6d96cc0db10  floating-widget-clock.js
f03cf949dd54dfe1b266aba2ca33527ba39dc3bd522cbcdd0b5ef4f448071ea3  floating-widget-clock.css
EOF
```

若你本地又改过源码，**以你 tag 当次 build 的 hash 为准**，并更新本表。

---

## 3. 三个实际入口 URL

相对路径（本地 `npx serve -p 3456 .`）：

| 入口 | 路径 |
|------|------|
| **总览（Orbit 多 Widget）** | http://127.0.0.1:3456/demo/ |
| **仅 Music** | http://127.0.0.1:3456/test-dist.html |
| **仅 Clock** | http://127.0.0.1:3456/test-clock.html |
| 示例首页（三入口导航） | http://127.0.0.1:3456/ |

官网：https://orbit.ykpgp0928.dpdns.org/ · Demo：https://orbit.ykpgp0928.dpdns.org/demo

线上 origin（任一均可，内容应对齐同一部署）：

- https://orbit.ykpgp0928.dpdns.org  
- https://fwf.ykpgp0928.dpdns.org  
- https://floating-widget-framework.ykpgp0928.dpdns.org  

完整线上入口示例：

- `https://orbit.ykpgp0928.dpdns.org/demo/`  
- `https://orbit.ykpgp0928.dpdns.org/test-dist.html`  
- `https://orbit.ykpgp0928.dpdns.org/test-clock.html`  

---

## 4. 测试设备记录（请本机补全）

| 类型 | 填写 |
|------|------|
| 桌面浏览器 | _例如 Chrome / Edge 版本_ |
| 移动 / 粗指针 | _例如 Android Chrome、必应 App、iOS Safari_ |
| 验收人 | _ |

---

## 5. 交互基线文档

| 文档 | 用途 |
|------|------|
| [phase0-baseline.md](../v0.1/phase0-baseline.md) | 早期交互检查表（若仍适用） |
| [v0.3-iteration.md](./v0.3-iteration.md) | v0.3 全流程与清单 |
| [API.md](../../API.md) / [CONFIG.md](../../CONFIG.md) | 0.2 公开配置 |

**本阶段约定：** 不改功能代码；v0.3 回归以本冻结 + 上述入口对照。

---

## 6. 冻结时能力摘要（v0.2）

- Music / Clock 独立包 + `orbit.js` 多 Widget  
- Launcher：桌面 `Alt+O`，移动端长按球  
- 全隐后移动端依赖长按（**尚无** ghost fallback — v0.3 Phase 5）  
- 移动卡片：右够→右展；不够→左展；两侧不够→水平移入视口  
- hide 语义为主；**尚无**完整 LifecycleScope / `destroy` 契约  

---

## 7. Phase 0 勾选

| 项 | 状态 |
|----|------|
| 冻结文档入库 | ✅（本文） |
| 构建 hash 记录 | ✅（上表；本机再确认） |
| 三个入口 URL 记录 | ✅ |
| 交互基线文档仍可用 | ✅ 指向已有 docs |
| 本阶段零功能代码 | ✅ |
| tag `v0.2-baseline` | ☐ **本机执行** |
| Commit SHA 填回 | ☐ **本机执行** |
| 测试设备填回 | ☐ **本机执行** |

---

## 8. 下一步

**Phase 1：** `LifecycleScope` + `"type":"module"` / `test:unit`（逆序、幂等、异常隔离），**无用户可见变化**。
