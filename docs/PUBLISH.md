# 发布到 GitHub 与 npm（零基础步骤）

下面默认你在**自己的电脑**上操作（需要网络、GitHub 账号、npm 账号）。

---

## 一、发布到 GitHub

### 1. 安装 Git（若还没有）

- Windows：安装 [Git for Windows](https://git-scm.com/)
- macOS：终端执行 `xcode-select --install` 或安装 Git
- 在终端执行 `git --version` 能出版本号即可

### 2. 在 GitHub 网站新建仓库

1. 打开 https://github.com/new  
2. Repository name 填：`floating-widget-framework`（可自定）  
3. 选 **Public**  
4. **不要**勾选 “Add a README”（本地已有文件）  
5. 点 Create repository  

### 3. 在项目目录初始化并推送

把下面的 `YOUR_USERNAME` 换成你的 GitHub 用户名。

```bash
cd 你的项目路径/artifacts

git init
git add .
git status
git commit -m "Release v0.1.0 — Floating Widget Framework"

git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/floating-widget-framework.git
git push -u origin main
```

若 GitHub 要求登录：按提示用浏览器登录，或使用 [Personal Access Token](https://github.com/settings/tokens) 作为密码。

### 4. 改 package.json 里的地址

打开 `package.json`，把三处 `YOUR_USERNAME` 改成你的用户名：

- `repository.url`
- `bugs.url`
- `homepage`

改完再提交一次：

```bash
git add package.json
git commit -m "docs: set GitHub repository URLs"
git push
```

---

## 二、发布到 npm

### 1. 注册 / 登录 npm

1. 注册：https://www.npmjs.com/signup  
2. 邮箱验证（必须完成）  
3. 终端登录：

```bash
npm login
```

按提示输入用户名、密码、邮箱；若开启 2FA，再输入 OTP。

检查：

```bash
npm whoami
```

### 2. 检查包名是否可用

```bash
npm view floating-widget-framework
```

- 若提示 `404`：名称可用  
- 若已有别人的包：改 `package.json` 的 `"name"`，例如：
  - `fwf-floating-widget`
  - 或作用域包：`@你的npm用户名/floating-widget-framework`

作用域包示例：

```json
"name": "@your-npm-name/floating-widget-framework",
"publishConfig": {
  "access": "public"
}
```

### 3. 本地构建并检查将要发布的文件

```bash
npm run build
npm pack --dry-run
```

确认列表里主要是 `dist/`、`README.md`、`LICENSE` 等，没有 `node_modules`。

### 4. 正式发布

```bash
npm publish
```

若使用 `@你的名字/...` 作用域包且要公开：

```bash
npm publish --access public
```

发布成功后，别人可以：

```bash
npm install floating-widget-framework
```

使用其中的：

```text
node_modules/floating-widget-framework/dist/floating-widget-music.js
node_modules/floating-widget-framework/dist/floating-widget-music.css
```

（或 clock 对应文件）

### 5. 版本更新（以后改代码再发）

按 [semver](https://semver.org/)：

```bash
npm version patch   # 0.1.0 → 0.1.1  修 bug
npm version minor   # 0.1.0 → 0.2.0  新功能
npm version major   # 0.1.0 → 1.0.0  不兼容变更

git push && git push --tags
npm publish
```

`prepublishOnly` 会在 publish 前自动执行 `npm run build`。

---

## 三、发布后建议

1. 在 GitHub 仓库 **About** 里填一行简介，可加 Topics：`hexo` `music-player` `widget`  
2. 创建 Release：Tags → `v0.1.0`，说明见 `CHANGELOG.md`  
3. README 顶部可加 npm 徽章（把包名换成真实的）：

```markdown
[![npm](https://img.shields.io/npm/v/floating-widget-framework.svg)](https://www.npmjs.com/package/floating-widget-framework)
```

---

## 四、注意

| 事项 | 说明 |
|------|------|
| 账号 | GitHub / npm 发布只能用**你自己**的账号，无法由他人代发 |
| 隐私 | 不要提交 `.env`、token、密码 |
| 包名唯一 | 全球 npm 包名不能重复 |
| MIT | 已有 `LICENSE`，可公开分享 |

---

## 五、最短清单

- [ ] GitHub 新建空仓库  
- [ ] `git init` → `add` → `commit` → `remote` → `push`  
- [ ] `package.json` 换成真实仓库地址  
- [ ] `npm login`  
- [ ] `npm view 包名` 确认可用  
- [ ] `npm run build` → `npm publish`  
