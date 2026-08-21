/**
 * check-links — markdown relative-link gate (M0)
 *
 * Scans README.md, CHANGELOG.md and docs/*.md for relative links
 * ([text](path) and [label]: path reference definitions) and verifies the
 * target file exists. External (http/https/mailto) and pure-anchor (#foo)
 * links are skipped. Fails (exit 1) on any missing target.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { dirname, join, resolve, sep } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const files = [
  join(root, "README.md"),
  join(root, "CHANGELOG.md"),
  ...readdirSync(join(root, "docs"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(root, "docs", f)),
];

// inline links: [text](path)  |  reference definitions: [label]: path
// (reference paths may contain spaces — take the rest of the line, minus
//  an optional trailing "title" in quotes)
const linkRe = /\[[^\]]*\]\(([^)]+)\)|^\[[^\]]*\]:\s*(\S[^\n]*)/gm;

let failed = false;
let checked = 0;

function checkTarget(target, fromFile, line) {
  const t = target.trim();
  if (!t) return;
  if (/^(https?:|mailto:|#|\/\/)/i.test(t)) return; // external / anchor / protocol-relative
  const withoutHash = t.split("#")[0].split("?")[0];
  if (!withoutHash) return; // pure anchor
  // resolve relative to the markdown file's directory
  const abs = resolve(dirname(fromFile), withoutHash);
  if (!existsSync(abs)) {
    console.error(
      "MISSING LINK " +
        t +
        "  (in " +
        fromFile.replace(root + sep, "") +
        ":" +
        line +
        ")"
    );
    failed = true;
    return;
  }
  checked += 1;
}

for (const file of files) {
  if (!existsSync(file)) {
    console.error("SKIP missing file:", file);
    continue;
  }
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    let m;
    linkRe.lastIndex = 0;
    while ((m = linkRe.exec(line))) {
      // reference definitions may carry a trailing "title" — strip it
      let ref = m[2] || m[1];
      ref = ref.replace(/\s+["'].*["']\s*$/, "");
      checkTarget(ref, file, i + 1);
    }
  });
}

if (failed) {
  console.error("\ncheck-links failed — fix or create the missing targets above");
  process.exit(1);
}
console.log("check-links passed (" + files.length + " files, " + checked + " relative links verified)");
