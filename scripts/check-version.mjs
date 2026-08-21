/**
 * check-version — single-source version gate (M0)
 *
 * Enforces that the runtime version string is authored in exactly one place
 * (src/core/version.js) and that package.json, dist/orbit.js and the key
 * user-facing docs all carry the same number. Fails (exit 1) on any drift.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let failed = false;
function fail(msg) {
  console.error("VERSION MISMATCH:", msg);
  failed = true;
}
function ok(msg) {
  console.log("OK", msg);
}

// 1) package.json
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const pkgVersion = pkg.version;
if (typeof pkgVersion !== "string" || !pkgVersion) fail("package.json version missing");
else ok("package.json " + pkgVersion);

// 2) src/core/version.js (the authored single source)
const versionSrc = readFileSync(join(root, "src/core/version.js"), "utf8");
const m = versionSrc.match(/export\s+const\s+VERSION\s*=\s*"([^"]+)"/);
if (!m) {
  fail("src/core/version.js has no VERSION export");
} else {
  const srcVersion = m[1];
  if (srcVersion !== pkgVersion) fail("src/core/version.js " + srcVersion + " ≠ package.json " + pkgVersion);
  else ok("src/core/version.js " + srcVersion);
}

// 3) dist/orbit.js carries the version string (after build)
const orbitDist = join(root, "dist/orbit.js");
if (existsSync(orbitDist)) {
  const text = readFileSync(orbitDist, "utf8");
  if (text.indexOf(pkgVersion) < 0) fail("dist/orbit.js does not contain " + pkgVersion);
  else ok("dist/orbit.js contains " + pkgVersion);
} else {
  ok("dist/orbit.js not built yet — skipped (run npm run build first)");
}

// 4) key user-facing docs carry the same number
const [major, minor] = pkgVersion.split(".");
const docChecks = [
  ["README.md", (t) => t.indexOf(pkgVersion) >= 0],
  ["docs/API.md", (t) => t.indexOf(pkgVersion) >= 0],
  ["CHANGELOG.md", (t) => t.indexOf("## " + pkgVersion) >= 0],
  ["demo/index.html", (t) => t.indexOf("Orbit " + major + "." + minor) >= 0],
];
for (const [rel, check] of docChecks) {
  const p = join(root, rel);
  if (!existsSync(p)) {
    fail(rel + " missing");
    continue;
  }
  const text = readFileSync(p, "utf8");
  if (!check(text)) fail(rel + " does not reference " + pkgVersion);
  else ok(rel + " references " + pkgVersion);
}

if (failed) {
  console.error("\ncheck-version failed — align version strings with package.json / src/core/version.js");
  process.exit(1);
}
console.log("\ncheck-version passed (single source: src/core/version.js = " + pkgVersion + ")");
