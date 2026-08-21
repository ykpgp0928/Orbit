/**
 * check-pack — npm package content gate (M4 fix)
 *
 * npm pack only ships what package.json "files" lists (plus README/LICENSE/
 * package.json automatically). This verifies the list covers the public
 * Contract materials — otherwise npm consumers get no extension contract,
 * migration guide or runnable example.
 *
 * NOTE: intentionally does not spawn `npm pack` (sandbox/CI friendly);
 * "files" is the direct control source of the tarball contents.
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const files = pkg.files || [];

const required = [
  "dist",
  "demo",
  "examples",
  "docs/API.md",
  "docs/CONFIG.md",
  "docs/THEME.md",
  "docs/CONTRACT-ALPHA.md",
  "docs/MIGRATION-v0.3.md",
  "docs/PROFILE.md",
  "docs/SECURITY.md",
  "docs/RELEASE-CHECKLIST.md",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
];

let failed = false;
for (const rel of required) {
  const listed = files.includes(rel);
  const exists = existsSync(join(root, rel));
  if (!listed || !exists) {
    console.error(
      "PACK MISSING:",
      rel,
      listed ? "" : "(not listed in package.json files)",
      exists ? "" : "(file/dir missing in repo)"
    );
    failed = true;
  } else {
    console.log("OK", rel);
  }
}

if (failed) {
  console.error("\ncheck-pack failed — npm tarball would lack Contract materials");
  process.exit(1);
}
console.log("check-pack passed (" + required.length + " package entries verified)");
