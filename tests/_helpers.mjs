/**
 * Shared DOM-test helpers (M2): static server, browser pick, assertions,
 * and page instrumentation (listener/audio counters).
 */
import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { dirname, join, extname } from "path";
import { fileURLToPath } from "url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** Tiny static file server rooted at the repo root. */
export function createStaticServer() {
  return createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
    const file = join(ROOT, rel);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type":
        MIME[extname(file).toLowerCase()] || "application/octet-stream",
    });
    res.end(readFileSync(file));
  });
}

/** System Edge → Chrome → bundled Chromium (CI). */
export function pickBrowser() {
  if (process.env.BROWSER) return { channel: process.env.BROWSER };
  const edge = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ].find((p) => existsSync(p));
  if (edge) return { executablePath: edge };
  const chrome = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ].find((p) => existsSync(p));
  if (chrome) return { executablePath: chrome };
  return { channel: "chromium" };
}

export let passCount = 0;
export let failCount = 0;

export function check(name, ok, detail) {
  if (ok) {
    passCount += 1;
    console.log("  PASS", name);
  } else {
    failCount += 1;
    console.log("  FAIL", name, detail !== undefined ? "— " + detail : "");
  }
}

/**
 * Must run BEFORE page scripts: wraps addEventListener / removeEventListener
 * on document + window with net counters, and counts Audio constructions.
 */
export function addListenerInstrumentation(page) {
  return page.addInitScript(() => {
    window.__ls = {
      docNet: 0,
      winNet: 0,
      docAdd: 0,
      docRem: 0,
      winAdd: 0,
      winRem: 0,
    };
    const patch = (target, key) => {
      const origAdd = target.addEventListener.bind(target);
      const origRem = target.removeEventListener.bind(target);
      target.addEventListener = function (t, f, o) {
        window.__ls[key + "Add"] += 1;
        window.__ls[key + "Net"] += 1;
        return origAdd(t, f, o);
      };
      target.removeEventListener = function (t, f, o) {
        window.__ls[key + "Rem"] += 1;
        window.__ls[key + "Net"] -= 1;
        return origRem(t, f, o);
      };
    };
    patch(document, "doc");
    patch(window, "win");
    const OrigAudio = window.Audio;
    window.__audioLive = 0;
    window.Audio = function (...args) {
      const inst = new OrigAudio(...args);
      window.__audioLive += 1;
      return inst;
    };
    window.Audio.prototype = OrigAudio.prototype;
    window.Audio.length = OrigAudio.length;
  });
}

export function stats(page) {
  return page.evaluate(() => ({
    docNet: window.__ls.docNet,
    winNet: window.__ls.winNet,
    audioLive: window.__audioLive,
  }));
}

/** Block every request outside the local test origin. */
export function blockExternalRequests(page, base) {
  return page.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    return route.abort();
  });
}
