/**
 * 组装 Cloudflare Pages / Workers 静态资源目录 site/
 * 只拷贝示例站点需要的文件，绝不包含 node_modules
 */
import {
  mkdirSync,
  cpSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "site");

if (existsSync(site)) {
  rmSync(site, { recursive: true, force: true });
}
mkdirSync(site, { recursive: true });

function copy(rel) {
  const from = join(root, rel);
  const to = join(site, rel);
  if (!existsSync(from)) {
    console.warn("skip missing:", rel);
    return;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(" +", rel);
}

// 首页与演示页
copy("index.html");
copy("demo");
copy("dist");
copy("test-dist.html");
copy("test-clock.html");

// 可选文档（便于示例站内打开）
copy("README.md");
copy("LICENSE");
if (existsSync(join(root, "docs"))) {
  mkdirSync(join(site, "docs"), { recursive: true });
  for (const name of ["API.md", "CONFIG.md", "THEME.md"]) {
    const p = join(root, "docs", name);
    if (existsSync(p)) {
      cpSync(p, join(site, "docs", name));
      console.log(" + docs/" + name);
    }
  }
}

// 简单 _headers：缓存 dist 静态资源（Cloudflare Pages 可读）
writeFileSync(
  join(site, "_headers"),
  `/*
  X-Content-Type-Options: nosniff

/dist/*
  Cache-Control: public, max-age=86400
`
);

console.log("\n✅ site/ 已准备好，可作 Cloudflare 输出目录");
