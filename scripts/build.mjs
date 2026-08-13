/**
 * 打包 Music + Clock 两个入口 → dist/
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from "fs";
import { dirname, join, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcRoot = join(root, "src");

const targets = [
  {
    name: "music",
    entry: join(srcRoot, "entry-music.js"),
    outfile: join(root, "dist/floating-widget-music.js"),
    cssFrom: existsSync(join(root, "working/music-player.css"))
      ? join(root, "working/music-player.css")
      : join(root, "baseline/music-player.css"),
    cssTo: join(root, "dist/floating-widget-music.css"),
    copyCss: true,
  },
  {
    name: "clock",
    entry: join(srcRoot, "entry-clock.js"),
    outfile: join(root, "dist/floating-widget-clock.js"),
    cssFrom: join(root, "src/widgets/clock/clock.css"),
    cssTo: join(root, "dist/floating-widget-clock.css"),
    copyCss: true,
  },
];

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) {
    throw new Error("仅支持相对路径 import: " + spec + " in " + fromFile);
  }
  let abs = resolve(dirname(fromFile), spec);
  if (!abs.endsWith(".js")) abs += ".js";
  return abs;
}

function bundle(entry) {
  const visited = new Set();
  const order = [];

  function walk(file) {
    const abs = resolve(file);
    if (visited.has(abs)) return;
    visited.add(abs);
    let code = readFileSync(abs, "utf8");
    const importRe =
      /^\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm;
    const deps = [];
    let m;
    while ((m = importRe.exec(code))) {
      deps.push(resolveImport(abs, m[2]));
    }
    for (const d of deps) walk(d);
    order.push(abs);
  }

  walk(entry);

  function transformModule(code, file) {
    code = code.replace(
      /^\s*import\s+[\s\S]*?\s+from\s+["'][^"']+["']\s*;?\s*$/gm,
      ""
    );
    code = code.replace(/^\s*export\s+function\s+/gm, "function ");
    code = code.replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, "");
    code = code.replace(/^\s*export\s+default\s+/gm, "var __fwf_default = ");
    code = code.replace(/^\s*export\s+(const|let|var)\s+/gm, "$1 ");
    code = code.replace(/^\s*export\s+async\s+function\s+/gm, "async function ");
    return "\n/* ---- " + relative(root, file) + " ---- */\n" + code;
  }

  let body = "";
  for (const f of order) {
    body += transformModule(readFileSync(f, "utf8"), f);
  }

  return {
    code:
      "/*! FWF bundled */\n(function(){\n\"use strict\";\n" +
      body +
      "\n})();\n",
    modules: order.length,
  };
}

mkdirSync(join(root, "dist"), { recursive: true });

// ensure clock css exists in src
const clockCssSrc = join(root, "src/widgets/clock/clock.css");
const clockCssDist = join(root, "dist/floating-widget-clock.css");
if (!existsSync(clockCssSrc) && existsSync(clockCssDist)) {
  // already have dist css from earlier
} 

for (const t of targets) {
  const result = bundle(t.entry);
  writeFileSync(t.outfile, result.code);
  if (t.copyCss && existsSync(t.cssFrom)) {
    cpSync(t.cssFrom, t.cssTo);
  } else if (t.name === "clock" && existsSync(clockCssDist)) {
    // keep existing dist css
  }
  console.log("✅", t.name, relative(root, t.outfile), result.code.length, "bytes,", result.modules, "modules");
}

console.log("\n成品: dist/floating-widget-music.* 与 dist/floating-widget-clock.*");
