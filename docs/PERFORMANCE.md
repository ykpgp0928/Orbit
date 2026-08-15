# Orbit 性能说明（Phase 7）

## 原则

1. **先测量，再改** — 不以「改成 transform 一定更快」为结论。  
2. **不牺牲几何** — ExpandPolicy / 点击区域 / 展开方向仍基于真实布局。  
3. **小步可回滚** — 本阶段只做已确认的低风险项。

## 推荐采集（维护者）

| 场景 | 工具 |
|------|------|
| 拖拽球 | Chrome Performance，录 2–3s |
| 移动端开卡 | 中低端 Android + 远程调试 |
| Dock / 歌单 | 同左 |

关注：长任务、Layout/Style 次数、是否在 pointermove 里同步强制布局。

## 本阶段已做（有代码依据）

| 改动 | 位置 | 理由 |
|------|------|------|
| **pointermove → rAF 合并** | `music-player-host` / `clock-host` | 降低拖拽路径上每事件一次的布局/绘制压力 |
| 进度条 **单次** `getBoundingClientRect` | music seek | 去掉同表达式二次测量 |
| 移动开卡减弱 blur（更早） | music CSS | 已知 jank 来源之一 |
| 显隐用 opacity/scale（更早） | Orbit / CSS | 避免 display 硬切 |

## 已知仍可能偏重（未在本阶段大改）

- 大面积 `backdrop-filter`（桌面玻璃）  
- Music `shellSync` 与 class 投影频率  
- 匿名监听残留（Phase 3 已说明）  

真机 Profile 若显示其它热点，再开独立 PR，避免与手感大改绑在一起。

## 回归

拖拽手感、磁吸、Dock、移动展开方向、Launcher 显隐动画需手测一轮。
