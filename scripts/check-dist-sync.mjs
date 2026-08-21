/**
 * Phase 6 — ensure dist/ artifacts exist after build (optional site/ check).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");

const required = [
  "orbit.js",
  "floating-widget-music.js",
  "floating-widget-music.css",
  "floating-widget-clock.js",
  "floating-widget-clock.css",
  "floating-widget-notice.css",
];

function sha256(file) {
  const buf = fs.readFileSync(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

let failed = false;

for (const name of required) {
  const p = path.join(distDir, name);
  if (!fs.existsSync(p)) {
    console.error("MISSING", name);
    failed = true;
    continue;
  }
  const st = fs.statSync(p);
  if (st.size < 100) {
    console.error("TOO SMALL", name, st.size);
    failed = true;
    continue;
  }
  console.log("OK", name, st.size + "B", sha256(p).slice(0, 12) + "…");
}

const siteDist = path.join(root, "site", "dist");
if (fs.existsSync(siteDist)) {
  let siteMismatch = false;
  for (const name of required) {
    const a = path.join(distDir, name);
    const b = path.join(siteDist, name);
    if (!fs.existsSync(b)) {
      console.warn("WARN site missing", name);
      continue;
    }
    if (sha256(a) !== sha256(b)) {
      console.warn("WARN site/dist stale", name, "(run npm run prepare-site)");
      siteMismatch = true;
    }
  }
  // Only hard-fail site drift when explicitly requested
  if (siteMismatch && process.env.FORCE_SITE_SYNC === "1") {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log("check-dist-sync passed");
