/**
 * Bundle entry points → dist/
 * Each source file gets its own IIFE scope + lightweight ESM shim
 * so Music/Clock hosts can share one orbit.js without const clashes.
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
    cssFrom: existsSync(join(root, "legacy/working/music-player.css"))
      ? join(root, "legacy/working/music-player.css")
      : join(root, "legacy/baseline/music-player.css"),
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
  {
    name: "orbit",
    entry: join(srcRoot, "entry-orbit.js"),
    outfile: join(root, "dist/orbit.js"),
    // M3: Notice CSS ships as its own file (dist/floating-widget-notice.css)
    copyCss: true,
    cssFrom: join(root, "src/widgets/notice/notice.css"),
    cssTo: join(root, "dist/floating-widget-notice.css"),
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

function modKey(abs) {
  return relative(root, abs).replace(/\\/g, "/");
}

function parseImports(code, fromFile) {
  const importRe =
    /^\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm;
  const deps = [];
  let m;
  while ((m = importRe.exec(code))) {
    deps.push({
      clause: m[1].trim(),
      abs: resolveImport(fromFile, m[2]),
      full: m[0],
    });
  }
  return deps;
}

function clauseToBindings(clause, modVar) {
  // default import: Orbit  OR  name
  if (!clause.startsWith("{")) {
    const name = clause.trim();
    if (!name) return "";
    // default + named: Orbit, { x } — rare; handle simple default only
    if (name.includes("{")) {
      const parts = name.split(",");
      let out = "";
      for (const p of parts) {
        const t = p.trim();
        if (t.startsWith("{")) {
          out += clauseToBindings(t, modVar);
        } else {
          out += "var " + t + " = " + modVar + ".default || " + modVar + "." + t + ";\n";
        }
      }
      return out;
    }
    return (
      "var " + name + " = " + modVar + ".default !== undefined ? " + modVar + ".default : " + modVar + "." + name + ";\n"
    );
  }
  // { a, b as c }
  const inner = clause.replace(/^\{|}$/g, "");
  const parts = inner.split(",").map((s) => s.trim()).filter(Boolean);
  let out = "";
  for (const p of parts) {
    const m = p.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
    if (!m) continue;
    const from = m[1];
    const to = m[2] || m[1];
    out += "var " + to + " = " + modVar + "." + from + ";\n";
  }
  return out;
}

function transformModule(code, file, key) {
  const deps = parseImports(code, file);
  let body = code;
  // strip import lines
  body = body.replace(
    /^\s*import\s+[\s\S]*?\s+from\s+["'][^"']+["']\s*;?\s*$/gm,
    ""
  );

  // Collect exports
  const exportNames = [];
  body = body.replace(/^\s*export\s+function\s+(\w+)/gm, function (_, n) {
    exportNames.push(n);
    return "function " + n;
  });
  body = body.replace(/^\s*export\s+async\s+function\s+(\w+)/gm, function (_, n) {
    exportNames.push(n);
    return "async function " + n;
  });
  body = body.replace(/^\s*export\s+(const|let|var)\s+(\w+)/gm, function (_, k, n) {
    exportNames.push(n);
    return k + " " + n;
  });
  body = body.replace(/^\s*export\s+default\s+/gm, "__mod.default = ");
  // export { a, b as c }
  body = body.replace(/^\s*export\s*\{([^}]*)\}\s*;?\s*$/gm, function (_, inner) {
    const parts = inner.split(",").map((s) => s.trim()).filter(Boolean);
    let lines = "";
    for (const p of parts) {
      const m = p.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
      if (!m) continue;
      const from = m[1];
      const to = m[2] || m[1];
      lines += "__mod." + to + " = " + from + ";\n";
      exportNames.push(to);
    }
    return lines;
  });

  let preamble = "";
  deps.forEach(function (d, i) {
    const mk = modKey(d.abs);
    const mv = "__dep" + i;
    preamble += "var " + mv + " = __require(" + JSON.stringify(mk) + ");\n";
    preamble += clauseToBindings(d.clause, mv);
  });

  let assign = "";
  const seen = new Set();
  exportNames.forEach(function (n) {
    if (seen.has(n)) return;
    seen.add(n);
    assign += "if (typeof " + n + " !== 'undefined') __mod." + n + " = " + n + ";\n";
  });

  return (
    "\n/* ---- " +
    key +
    " ---- */\n" +
    "__modules[" +
    JSON.stringify(key) +
    "] = function (__mod, __require) {\n" +
    preamble +
    body +
    "\n" +
    assign +
    "\n};\n"
  );
}

function bundle(entry) {
  const visited = new Set();
  const order = [];

  function walk(file) {
    const abs = resolve(file);
    if (visited.has(abs)) return;
    visited.add(abs);
    const code = readFileSync(abs, "utf8");
    const deps = parseImports(code, abs);
    for (const d of deps) walk(d.abs);
    order.push(abs);
  }

  walk(entry);

  let body = "";
  for (const f of order) {
    body += transformModule(readFileSync(f, "utf8"), f, modKey(f));
  }

  const entryKey = modKey(resolve(entry));

  const code =
    "/*! Orbit / FWF bundled */\n" +
    "(function () {\n" +
    '"use strict";\n' +
    "var __modules = {};\n" +
    "var __cache = {};\n" +
    "function __require(k) {\n" +
    "  if (__cache[k]) return __cache[k];\n" +
    "  var m = { default: undefined };\n" +
    "  var factory = __modules[k];\n" +
    "  if (!factory) throw new Error('Module not found: ' + k);\n" +
    "  __cache[k] = m;\n" +
    "  factory(m, __require);\n" +
    "  return m;\n" +
    "}\n" +
    body +
    "\n__require(" +
    JSON.stringify(entryKey) +
    ");\n" +
    "})();\n";

  return { code: code, modules: order.length };
}

mkdirSync(join(root, "dist"), { recursive: true });

for (const t of targets) {
  const result = bundle(t.entry);
  writeFileSync(t.outfile, result.code);
  if (t.copyCss && existsSync(t.cssFrom)) {
    cpSync(t.cssFrom, t.cssTo);
  }
  console.log(
    "✅",
    t.name,
    relative(root, t.outfile),
    result.code.length,
    "bytes,",
    result.modules,
    "modules"
  );
}

console.log("\n成品: dist/floating-widget-music|clock|orbit.*");
