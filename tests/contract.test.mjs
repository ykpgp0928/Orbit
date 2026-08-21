/**
 * Orbit Contract Alpha — Reference Widget walk-through (M2)
 *
 * Proves the full contract chain on a bare static page:
 *   register → mount(ctx) → profile read/write → launcher metadata
 *   → portal claim → setVisible (hide ≠ destroy) → destroy → remount
 *
 * The widget (examples/reference-widget/badge.js) uses ONLY the public
 * window.Orbit surface — no runtime imports, no window/document-level
 * global listeners of its own, no Orbit private CSS classes.
 */
import { chromium } from "playwright-core";
import {
  createStaticServer,
  pickBrowser,
  addListenerInstrumentation,
  blockExternalRequests,
  stats,
  check,
  passCount,
  failCount,
} from "./_helpers.mjs";

async function main() {
  const server = createStaticServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  console.log("static server on", base);

  const launchOpts = { headless: true, pipe: false, ...pickBrowser() };
  console.log("launching browser:", JSON.stringify(launchOpts));
  const browser = await chromium.launch(launchOpts);

  try {
    const page = await browser.newPage();
    await addListenerInstrumentation(page);
    await blockExternalRequests(page, base);

    console.log("\n[1] bare page + register + mount");
    await page.goto(base + "/tests/contract-test.html");
    await page.waitForFunction(
      () => document.getElementById("example-status"),
      { timeout: 10000 }
    );
    await page.waitForTimeout(200);

    check(
      "widget registered (listHosts includes example-status)",
      await page.evaluate(() =>
        window.Orbit.listHosts().includes("example-status")
      )
    );
    check(
      "definition in registry (listRegistered includes example-status)",
      await page.evaluate(() =>
        window.Orbit.listRegistered().includes("example-status")
      )
    );
    check(
      "metadata label exposed via getLabel",
      (await page.evaluate(() => window.Orbit.getLabel("example-status"))) ===
        "Status 状态"
    );
    check(
      "mount() root attached",
      await page.evaluate(() => {
        const el = document.getElementById("example-status");
        return !!el && document.body.contains(el);
      })
    );
    check(
      "portal claimed and attached",
      await page.evaluate(() => {
        const el = document.getElementById("example-status-sheet");
        return !!el && document.body.contains(el);
      })
    );

    console.log("\n[2] profile read/write (per-widget namespace)");
    const clicks0 = await page.evaluate(() =>
      window.Orbit.get("example-status")
    );
    check("instance tracked by Runtime", !!clicks0 && clicks0.started);
    await page.click("#example-status");
    await page.waitForFunction(
      () =>
        (localStorage.getItem("orbit-profile:example-status") || "").indexOf(
          '"clicks":1'
        ) >= 0,
      { timeout: 5000 }
    );
    check(
      "click persisted to namespaced profile key",
      await page.evaluate(() =>
        (localStorage.getItem("orbit-profile:example-status") || "").includes(
          '"clicks":1'
        )
      )
    );
    check(
      "badge UI reflects profile",
      (await page.textContent("#example-status .ref-badge-text")) ===
        "Clicks: 1"
    );

    console.log("\n[3] launcher driven by Contract metadata");
    await page.evaluate(() => window.Orbit.openLauncher());
    await page.waitForSelector('#orbit-launcher .ol-row[data-id="example-status"]');
    const labelText = await page.textContent(
      '#orbit-launcher .ol-row[data-id="example-status"] .ol-name'
    );
    check(
      "launcher shows metadata label (not hardcoded)",
      labelText === "Status 状态"
    );
    check(
      "music/clock labels come from adapter metadata",
      (await page.textContent(
        '#orbit-launcher .ol-row[data-id="music"] .ol-name'
      )) === "Music 音乐"
    );
    check(
      "unmounted registered widgets show OFF, mounted show ON (honest state)",
      await page.evaluate(() => {
        const row = (id) =>
          document.querySelector(
            '#orbit-launcher .ol-row[data-id="' + id + '"] input[data-ol-toggle]'
          );
        return (
          row("music") &&
          !row("music").checked &&
          row("notice") &&
          !row("notice").checked &&
          row("example-status") &&
          row("example-status").checked
        );
      })
    );
    // label escaping: a hostile label must not inject markup
    await page.evaluate(() => {
      window.Orbit.register({
        id: "escape-probe",
        label: '<img src=x onerror="window.__xss=1">',
        version: "0.4",
        mount: function () {
          const el = document.createElement("div");
          document.body.appendChild(el);
          return {
            root: el,
            destroy: function () {
              if (el.parentNode) el.parentNode.removeChild(el);
            },
          };
        },
      });
      window.Orbit.openLauncher();
    });
    const xss = await page.evaluate(() => window.__xss || 0);
    check("hostile label is escaped (no XSS)", !xss);
    await page.evaluate(() => window.Orbit.closeLauncher());

    console.log("\n[4] setVisible: hide ≠ destroy");
    await page.evaluate(() => window.Orbit.setVisible("example-status", false));
    await page.waitForTimeout(320); // hide transition timer
    check(
      "hidden: root aria-hidden + orbit-hidden, instance kept",
      await page.evaluate(() => {
        const el = document.getElementById("example-status");
        return (
          !!el &&
          el.getAttribute("aria-hidden") === "true" &&
          el.classList.contains("orbit-hidden") &&
          window.Orbit.get("example-status").started
        );
      })
    );
    await page.evaluate(() => window.Orbit.setVisible("example-status", true));
    await page.waitForTimeout(50);
    check(
      "shown again: aria-hidden false, instance alive",
      await page.evaluate(() => {
        const el = document.getElementById("example-status");
        return (
          !!el &&
          el.getAttribute("aria-hidden") === "false" &&
          !el.classList.contains("orbit-hidden")
        );
      })
    );

    console.log("\n[5] destroy → remount ×2 (listener discipline)");
    const baseStats = await stats(page);
    for (let i = 1; i <= 2; i++) {
      await page.evaluate(() => window.Orbit.destroy("example-status"));
      await page.waitForFunction(
        () =>
          !document.getElementById("example-status") &&
          !document.getElementById("example-status-sheet"),
        { timeout: 5000 }
      );
      check(
        "destroy#" + i + " removes root + portal",
        true
      );
      await page.evaluate(() =>
        window.Orbit.mount({
          widgets: [{ id: "example-status", visible: true }],
        })
      );
      await page.waitForFunction(
        () => document.getElementById("example-status"),
        { timeout: 5000 }
      );
      await page.waitForFunction(
        () =>
          document.querySelector("#example-status .ref-badge-text") &&
          document.querySelector("#example-status .ref-badge-text")
            .textContent === "Clicks: 1",
        { timeout: 5000 }
      );
      check(
        "remount#" + i + " profile restored across instances",
        true
      );
    }
    const endStats = await stats(page);
    check(
      "no document listener growth after 2 destroy/remount cycles (docNet " +
        baseStats.docNet +
        " → " +
        endStats.docNet +
        ")",
      endStats.docNet <= baseStats.docNet
    );
    check(
      "no window listener growth (winNet " +
        baseStats.winNet +
        " → " +
        endStats.winNet +
        ")",
      endStats.winNet <= baseStats.winNet
    );

    console.log("\n[6] external-author constraints");
    check(
      "widget adds NO document/window listeners of its own (docNet " +
        baseStats.docNet +
        " → " +
        endStats.docNet +
        ", winNet " +
        baseStats.winNet +
        " → " +
        endStats.winNet +
        ")",
      endStats.docNet <= baseStats.docNet && endStats.winNet <= baseStats.winNet
    );
    // final teardown before asserting portal release
    await page.evaluate(() => window.Orbit.destroy("example-status"));
    await page.waitForFunction(
      () =>
        !document.getElementById("example-status") &&
        !document.getElementById("example-status-sheet"),
      { timeout: 5000 }
    );
    const sheetGone = await page.evaluate(
      () => !document.getElementById("example-status-sheet")
    );
    check("portal released on final destroy", sheetGone);
    // cleanup probe widget
    await page.evaluate(() => {
      window.Orbit.destroy("escape-probe");
    });

    console.log("\n[7] mount failure → instance NOT marked started (M4 fix)");
    await page.evaluate(() => {
      window.Orbit.register({
        id: "mount-fail",
        version: "0.4",
        label: "Mount Fail",
        mount: function () {
          throw new Error("boom");
        },
      });
      window.Orbit.setVisible("mount-fail", true);
    });
    await page.waitForTimeout(300);
    check(
      "failed mount leaves instance unstarted + invisible (Launcher OFF)",
      await page.evaluate(() => {
        const inst = window.Orbit.get("mount-fail");
        return !!inst && inst.started === false && inst.visible === false;
      })
    );
    check(
      "no root created for failed mount",
      await page.evaluate(() => !document.getElementById("mount-fail"))
    );
    // repeated setVisible retries start but never fakes success
    await page.evaluate(() => window.Orbit.setVisible("mount-fail", true));
    await page.waitForTimeout(1200); // past paint retry window
    check(
      "repeated setVisible after failure still not marked started",
      await page.evaluate(() => {
        const inst = window.Orbit.get("mount-fail");
        return !!inst && inst.started === false;
      })
    );
    await page.evaluate(() => window.Orbit.destroy("mount-fail", { forget: true }));

    console.log("\n[8] Profile Alpha: export / import / tolerance (M4)");
    // seed representative state across all storage layers
    await page.evaluate(() => {
      localStorage.setItem(
        "orbit-profile:notice",
        JSON.stringify({ title: "T", text: "X", dismissed: true })
      );
      localStorage.setItem("orbit-profile:clock", JSON.stringify({ x: 30, y: -40 }));
      localStorage.setItem(
        "orbit-visible-v1",
        JSON.stringify({ music: true, clock: false, notice: true })
      );
      localStorage.setItem(
        "mp-state-v3",
        JSON.stringify({ position: { x: 5, y: 6 }, volume: 0.8 })
      );
    });
    const exported = await page.evaluate(() => window.Orbit.exportProfile());
    check(
      "export: envelope fields (schema/exportedAt/runtime)",
      exported.schema === "orbit-profile/0.4" &&
        typeof exported.exportedAt === "string" &&
        !!exported.runtime
    );
    check(
      "export: visibility captured",
      exported.runtime.visibility.clock === false &&
        exported.runtime.visibility.notice === true
    );
    check(
      "export: per-widget profiles captured",
      exported.widgets.notice.dismissed === true &&
        exported.widgets.clock.x === 30
    );
    check(
      "export: music legacy state captured as widgets.music.state",
      !!exported.widgets.music &&
        exported.widgets.music.state &&
        exported.widgets.music.state.volume === 0.8
    );

    // roundtrip: wreck local storage, import back
    await page.evaluate(() => {
      localStorage.setItem("orbit-visible-v1", JSON.stringify({ music: false }));
      localStorage.removeItem("orbit-profile:notice");
    });
    const imp = await page.evaluate(
      (p) => window.Orbit.importProfile(p),
      exported
    );
    check(
      "import: ok + reports imported ids",
      imp.ok === true &&
        imp.imported.widgets.includes("notice") &&
        imp.imported.visibility.includes("music") &&
        imp.imported.visibility.includes("clock")
    );
    check(
      "import: visibility restored (music true, clock false)",
      await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("orbit-visible-v1") || "{}");
        return p.music === true && p.clock === false;
      })
    );
    check(
      "import: widget profile restored",
      await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("orbit-profile:notice") || "{}");
        return p.dismissed === true && p.text === "X";
      })
    );
    check(
      "import: music legacy state restored",
      await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("mp-state-v3") || "{}");
        return p.volume === 0.8 && p.position.x === 5;
      })
    );

    // strict envelope rejection
    const badJson = await page.evaluate(() =>
      window.Orbit.importProfile("{broken json")
    );
    check("import: invalid JSON rejected cleanly", badJson.ok === false && badJson.error === "invalid-json");
    const badSchema = await page.evaluate(() =>
      window.Orbit.importProfile({ schema: "orbit-profile/9.9" })
    );
    check(
      "import: unsupported schema rejected cleanly",
      badSchema.ok === false && String(badSchema.error).includes("9.9")
    );

    // tolerance: unknown widgets + corrupted single entry
    const partial = await page.evaluate(() =>
      window.Orbit.importProfile({
        schema: "orbit-profile/0.4",
        runtime: { visibility: { music: false, clock: 42 } },
        widgets: {
          "future-widget": { a: 1 },
          "broken-entry": "not-an-object",
          clock: { x: 99, y: -1 },
        },
      })
    );
    check(
      "import: corrupted entries skipped, rest applied (ok + counts)",
      partial.ok === true &&
        partial.imported.widgets.includes("clock") &&
        partial.imported.widgets.includes("future-widget") &&
        !partial.imported.widgets.includes("broken-entry")
    );
    check(
      "import: corrupted widget entry does not block others",
      await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("orbit-profile:clock") || "{}");
        return p.x === 99;
      })
    );
    check(
      "import: unknown widget data preserved for later registration",
      await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("orbit-profile:future-widget") || "{}");
        return p.a === 1;
      })
    );
    check(
      "import: non-boolean visibility entry ignored",
      await page.evaluate(() => {
        const p = JSON.parse(localStorage.getItem("orbit-visible-v1") || "{}");
        return p.music === false && !("clock" in p && p.clock === 42);
      })
    );
    // cleanup seeded keys
    await page.evaluate(() => {
      ["orbit-profile:future-widget", "orbit-profile:broken-entry"].forEach(
        (k) => localStorage.removeItem(k)
      );
    });
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
