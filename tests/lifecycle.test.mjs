/**
 * Orbit DOM lifecycle tests (M1 — Lifecycle Hardening)
 *
 * Runs against the real browser (system Edge/Chrome, or bundled Chromium)
 * and the real dist/orbit.js via a tiny local static server.
 *
 * Asserts (v0.4 plan Milestone 1 acceptance):
 *  1. music/clock mount → destroy → mount ×3 with NO listener-count growth
 *  2. destroy removes root + owned portal; no detached-root revival
 *  3. window.__mpGhostClickBlocker global flag is gone after destroy
 *  4. audio element count: single pointer session = single business reaction
 *  5. clock destroy/remount idempotent, same listener discipline
 *
 * Run:  npm run test:dom        (or: BROWSER=chromium node tests/lifecycle.test.mjs)
 */
import { chromium } from "playwright-core";
import {
  createStaticServer,
  pickBrowser,
  addListenerInstrumentation,
  blockExternalRequests,
  check,
  passCount,
  failCount,
} from "./_helpers.mjs";

// ---------------------------------------------------------------- asserts
const stats = (page) =>
  page.evaluate(() => ({
    docNet: window.__ls.docNet,
    winNet: window.__ls.winNet,
    audioLive: window.__audioLive,
    ghostBlocker: !!window.__mpGhostClickBlocker,
  }));

async function destroyMountCycle(page, id, rootId, portalId, checkGhost) {
  const before = await stats(page);

  // destroy
  await page.evaluate((wid) => window.Orbit.destroy(wid), id);
  await page.waitForFunction(
    (rid) => !document.getElementById(rid),
    rootId,
    { timeout: 5000 }
  );
  const afterDestroy = await stats(page);

  check(
    "destroy(" + id + ") removes root #" + rootId,
    !(await page.evaluate((rid) => document.getElementById(rid), rootId))
  );
  if (portalId) {
    check(
      "destroy(" + id + ") removes owned portal #" + portalId,
      !(await page.evaluate((pid) => document.getElementById(pid), portalId))
    );
  }
  if (checkGhost) {
    check(
      "destroy(" + id + ") clears global ghost-blocker flag",
      !afterDestroy.ghostBlocker
    );
  }
  check(
    "destroy(" + id + ") releases document listeners (docNet " + before.docNet + " → " + afterDestroy.docNet + ")",
    afterDestroy.docNet <= before.docNet
  );
  check(
    "destroy(" + id + ") releases window listeners (winNet " + before.winNet + " → " + afterDestroy.winNet + ")",
    afterDestroy.winNet <= before.winNet
  );
  check(
    "destroy(" + id + ") does not create audio",
    afterDestroy.audioLive === before.audioLive
  );

  // remount
  await page.evaluate(
    (wid) => window.Orbit.mount({ widgets: [{ id: wid, visible: true }] }),
    id
  );
  await page.waitForFunction(
    (rid) => !!document.getElementById(rid),
    rootId,
    { timeout: 5000 }
  );
  const afterMount = await stats(page);

  check(
    "remount(" + id + ") root is attached to body",
    await page.evaluate(
      (rid) => {
        const el = document.getElementById(rid);
        return !!el && document.body.contains(el);
      },
      rootId
    )
  );
  check(
    "remount(" + id + ") no listener growth (docNet " + before.docNet + " → " + afterMount.docNet + ")",
    afterMount.docNet <= before.docNet
  );
  check(
    "remount(" + id + ") no window listener growth (winNet " + before.winNet + " → " + afterMount.winNet + ")",
    afterMount.winNet <= before.winNet
  );
  check(
    "remount(" + id + ") audio instances do not accumulate (audioLive " + before.audioLive + " → " + afterMount.audioLive + ")",
    afterMount.audioLive <= before.audioLive + 1
  );

  return { afterDestroy, afterMount };
}

// ---------------------------------------------------------------- main
async function main() {
  const server = createStaticServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const base = "http://127.0.0.1:" + port;
  console.log("static server on", base);

  const launchOpts = { headless: true, pipe: false, ...pickBrowser() };
  console.log("launching browser:", JSON.stringify(launchOpts));
  const browser = await chromium.launch(launchOpts);

  try {
    const page = await browser.newPage();

    // Instrument listener add/remove + Audio construction BEFORE page scripts run.
    await addListenerInstrumentation(page);

    // Deterministic: block all external requests (Meting APIs etc).
    await blockExternalRequests(page, base);

    console.log("\n[1] initial mount (test-orbit.html)");
    await page.goto(base + "/test-orbit.html");
    await page.waitForFunction(
      () =>
        document.getElementById("music-player") &&
        document.getElementById("fwf-clock"),
      { timeout: 10000 }
    );
    await page.waitForTimeout(300); // let init settle (fetch failure fast-path)
    check(
      "notice NOT auto-mounted without config (defaultVisible:false, M4 fix)",
      await page.evaluate(() => !document.getElementById("orbit-notice"))
    );

    console.log("\n[2] music lifecycle ×3");
    for (let i = 1; i <= 3; i++) {
      console.log("  — round " + i);
      await destroyMountCycle(page, "music", "music-player", "mp-dock-list", true);
    }

    console.log("\n[3] clock lifecycle ×3");
    for (let i = 1; i <= 3; i++) {
      console.log("  — round " + i);
      await destroyMountCycle(page, "clock", "fwf-clock", null, false);
    }

    console.log("\n[4] single pointer session → single business reaction");
    const audioBefore = await page.evaluate(() => window.__audioLive);
    await page.evaluate(() => {
      const cover = document.getElementById("mp-cover");
      const opts = {
        pointerId: 7,
        pointerType: "mouse",
        button: 0,
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      };
      cover.dispatchEvent(new PointerEvent("pointerdown", opts));
      document.dispatchEvent(new PointerEvent("pointerup", opts));
    });
    await page.waitForTimeout(150);
    const audioAfter = await page.evaluate(() => window.__audioLive);
    check(
      "one tap on music ball → exactly one toggle reaction (audioLive " + audioBefore + " → " + audioAfter + ")",
      audioAfter - audioBefore === 1
    );

    console.log("\n[5] final teardown leaves no roots");
    await page.evaluate(() => {
      window.Orbit.destroy("music");
      window.Orbit.destroy("clock");
    });
    await page.waitForFunction(
      () =>
        !document.getElementById("music-player") &&
        !document.getElementById("fwf-clock") &&
        !document.getElementById("mp-dock-list")
    );
    check(
      "both widgets destroyed → no roots/portals remain",
      true
    );

    console.log("\n[6] standalone entries (no Orbit Runtime, M3 regression)");
    await page.goto(base + "/test-clock.html");
    await page.waitForFunction(() => document.getElementById("fwf-clock"), {
      timeout: 10000,
    });
    check(
      "standalone clock mounts without Runtime",
      true
    );
    await page.evaluate(() => window.__FWF_CLOCK__.destroy());
    await page.waitForFunction(() => !document.getElementById("fwf-clock"), {
      timeout: 5000,
    });
    check(
      "standalone clock destroys via __FWF_CLOCK__",
      true
    );
    await page.evaluate(() => window.__FWF_CLOCK__.start());
    await page.waitForFunction(() => document.getElementById("fwf-clock"), {
      timeout: 5000,
    });
    check(
      "standalone clock restarts via __FWF_CLOCK__.start",
      true
    );

    console.log("\n[7] destroy while playlist fetch is in flight (M4 fix)");
    const page2 = await browser.newPage();
    await addListenerInstrumentation(page2);
    let releaseApi;
    const apiHeld = new Promise((r) => {
      releaseApi = r;
    });
    // hold Meting API requests, then fulfill with a fake playlist
    await page2.route("**/*", (route) => {
      const u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (
        u.includes("injahow") ||
        u.includes("mikus") ||
        u.includes("i-meto")
      ) {
        apiHeld
          .then(() =>
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify([
                { name: "T1", artist: "A1", url: "https://example.com/1.mp3", pic: "", lrc: "" },
              ]),
            })
          )
          .catch(() => {});
        return;
      }
      return route.abort();
    });
    await page2.goto(base + "/test-dist.html");
    await page2.waitForFunction(() => document.getElementById("music-player"), {
      timeout: 10000,
    });
    await page2.waitForTimeout(150); // fetch issued, held by route
    await page2.evaluate(() => window.__FWF_MUSIC_API__.destroy());
    const audioBeforeRelease = await page2.evaluate(() => window.__audioLive);
    releaseApi(); // playlist now resolves into a DESTROYED instance
    await page2.waitForTimeout(600);
    const audioAfterRelease = await page2.evaluate(() => window.__audioLive);
    check(
      "destroy during fetch: no audio/UI revival after request settles (audioLive " +
        audioBeforeRelease +
        " → " +
        audioAfterRelease +
        ")",
      audioAfterRelease === 0 &&
        audioAfterRelease === audioBeforeRelease &&
        !(await page2.evaluate(() => !!document.getElementById("music-player")))
    );
    await page2.close();

    console.log("\n[8] destroy during active drag session (M4 fix)");
    await page.goto(base + "/test-orbit.html");
    await page.waitForFunction(
      () =>
        document.getElementById("music-player") &&
        document.getElementById("fwf-clock"),
      { timeout: 10000 }
    );
    await page.waitForTimeout(300);
    // music: open a pointer session (document listeners added), destroy
    let s = await stats(page);
    const baseNet = s.docNet;
    await page.evaluate(() => {
      const cover = document.getElementById("mp-cover");
      cover.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 21,
          pointerType: "mouse",
          button: 0,
          bubbles: true,
          clientX: 50,
          clientY: 50,
        })
      );
    });
    s = await stats(page);
    check(
      "drag session adds document listeners (docNet " + baseNet + " → " + s.docNet + ")",
      s.docNet > baseNet
    );
    await page.evaluate(() => window.Orbit.destroy("music"));
    await page.waitForTimeout(150);
    s = await stats(page);
    check(
      "music destroy during drag releases document listeners (docNet → " + s.docNet + ")",
      s.docNet <= baseNet
    );
    // clock: same discipline
    await page.evaluate(() => {
      const root = document.getElementById("fwf-clock");
      root.dispatchEvent(
        new PointerEvent("pointerdown", {
          pointerId: 22,
          pointerType: "mouse",
          button: 0,
          bubbles: true,
          clientX: 60,
          clientY: 60,
        })
      );
    });
    s = await stats(page);
    const clockSessionNet = s.docNet;
    await page.evaluate(() => window.Orbit.destroy("clock"));
    await page.waitForTimeout(150);
    s = await stats(page);
    check(
      "clock destroy during drag releases document listeners (docNet → " + s.docNet + ")",
      s.docNet <= clockSessionNet - 3 || s.docNet <= baseNet
    );
  } finally {
    await browser.close();
    server.close();
  }

  console.log(
    "\nRESULT: " + passCount + " passed, " + failCount + " failed"
  );
  process.exit(failCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("test run crashed:", err);
  process.exit(2);
});
