# Orbit Profile（0.4 Alpha）

面向 **用户** 与 **主题维护者**：Orbit 的本地数据存在哪里、如何导出/导入/清除，以及 schema 如何演进。

> **原则：数据留在浏览器本地。导出完全由用户主动触发；没有任何服务端上传。**

## 1. 数据保存在哪里

| 存储 key | 内容 | 归属 |
|---|---|---|
| `orbit-visible-v1` | 每个 Widget 的开/关偏好（Launcher 开关、公告关闭） | Runtime |
| `orbit-profile:<widgetId>` | 每个 Widget 自己的隔离状态（如 Notice 的文本、Clock 的位置） | Widget（`ctx.profile`） |
| `mp-state-v3` | Music 的 legacy 状态（位置、音量、歌单进度） | Music Host（历史遗留） |

清除单个项：`localStorage.removeItem("orbit-visible-v1")`、`localStorage.removeItem("orbit-profile:notice")` 等。

## 2. 导出（用户主动触发）

在控制台执行，或由主题提供"导出设置"按钮：

```js
const profile = Orbit.exportProfile();
const json = JSON.stringify(profile, null, 2);
// 保存为文件（示例）：
const blob = new Blob([json], { type: "application/json" });
const a = document.createElement("a");
a.href = URL.createObjectURL(blob);
a.download = "orbit-profile.json";
a.click();
```

导出的 envelope：

```json
{
  "schema": "orbit-profile/0.4",
  "exportedAt": "2026-08-16T00:00:00.000Z",
  "runtime": {
    "launcherKey": "Alt+O",
    "visibility": { "music": true, "clock": true, "notice": false }
  },
  "widgets": {
    "notice": { "title": "公告", "text": "……", "dismissed": true },
    "clock": { "x": 120, "y": -20 },
    "music": { "state": { "position": { "x": 0, "y": 0 }, "volume": 0.7 } }
  }
}
```

## 3. 导入

```js
// 接受对象或 JSON 字符串
const result = Orbit.importProfile(jsonOrObject);
// result = { ok: true, imported: { widgets: ["notice","clock","music"], visibility: ["music","clock"] } }
// 失败时 result = { ok: false, error: "unsupported-schema: orbit-profile/9.9" }
```

导入语义：

- **schema 严格**：`schema` 必须是 `orbit-profile/0.4`，否则整体拒绝并给出清晰错误（`invalid-json` / `not-an-object` / `unsupported-schema`）。
- **可见性合并**：只覆盖导入的 widget id，不删除本地其他偏好。
- **单项容错**：某个 widget 条目损坏（非对象）时**跳过该条**，不影响其他条目恢复。
- **未知 Widget 数据保留**：未注册的 widget id 数据会原样写入其命名空间，之后注册该 widget 即可继续使用——导入永不报错或丢弃。
- **生效时机**：导入写入本地存储；已打开页面的当前实例状态不变，**下次页面加载**按恢复后的偏好生效。

## 4. Schema 演进

- 当前：`orbit-profile/0.4`（与 v0.4 版本号一致）。
- 0.5 若调整 Profile 结构，会新增 schema 版本号；导入器对未知 schema 一律**清晰拒绝**而非静默误读。
- 跨版本迁移工具在出现第二个 schema 版本时再提供。

## 5. 隐私说明

- Profile 只存在于 `localStorage`（浏览器本地）。
- 导出是纯本地操作：生成 JSON 字符串，由你决定是否保存/传输。
- Orbit 不含任何上传、遥测或同步逻辑；未来若讨论可选同步，必须先有多站点实际采用同一 schema 的证据。

## 6. 相关

- [API.md](./API.md)（`Orbit.exportProfile` / `Orbit.importProfile`）
- [CONTRACT-ALPHA.md](./CONTRACT-ALPHA.md)（`ctx.profile` 服务）
