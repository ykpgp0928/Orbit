/**
 * Orbit M3 — three-widget coexistence + isolation (Contract path)
 *
 * Music (wrapped shell), Clock (Contract reference) and Notice (third
 * heterogeneous host) all registered via Orbit.register() and driven by
 * the same mount/destroy/visibility/Profile API. Asserts that hiding or
 * destroying any one never breaks the other two, Launcher is metadata
 * driven, and Notice's dismiss state survives destroy/remount via profile.
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

    console.log("\n[1] three widgets mount together");
    await page.goto(base + "/tests/m3-test.html");
    await page.waitForFunction(
      () =>
        document.getElementById("music-player") &&
        document.getElementById("fwf-clock") &&
        document.getElementById("orbit-notice"),
      { timeout: 10000 }
    );
    await page.waitForTimeout(300);
    check(
      "music + clock + notice all mounted via Contract path",
      true
    );
    check(
      "all three registered as hosts",
      await page.evaluate(() => {
        const h = window.Orbit.listHosts();
        return h.includes("music") && h.includes("clock") && h.includes("notice");
      })
    );

    console.log("\n[2] launcher fully metadata-driven");
    await page.evaluate(() => window.Orbit.openLauncher());
    await page.waitForSelector("#orbit-launcher .ol-row");
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll("#orbit-launcher .ol-row")).map(
        (r) => r.querySelector(".ol-name").textContent
      )
    );
    check(
      "launcher lists all three labels (Music 音乐 / Clock 时钟 / Notice 公告)",
      rows.includes("Music 音乐") &&
        rows.includes("Clock 时钟") &&
        rows.includes("Notice 公告")
    );
    await page.evaluate(() => window.Orbit.closeLauncher());

    const baseStats = await stats(page);

    console.log("\n[3] destroy music → clock & notice unaffected");
    await page.evaluate(() => window.Orbit.destroy("music"));
    await page.waitForFunction(() => !document.getElementById("music-player"));
    check(
      "clock still alive after music destroy",
      await page.evaluate(() => !!document.getElementById("fwf-clock"))
    );
    check(
      "notice still alive after music destroy",
      await page.evaluate(() => !!document.getElementById("orbit-notice"))
    );
    await page.evaluate(() =>
      window.Orbit.mount({ widgets: [{ id: "music", visible: true }] })
    );
    await page.waitForFunction(() => document.getElementById("music-player"));
    check("music remounts cleanly", true);

    console.log("\n[4] destroy clock → notice & music unaffected");
    await page.evaluate(() => window.Orbit.destroy("clock"));
    await page.waitForFunction(() => !document.getElementById("fwf-clock"));
    check(
      "notice still alive after clock destroy",
      await page.evaluate(() => !!document.getElementById("orbit-notice"))
    );
    check(
      "music still alive after clock destroy",
      await page.evaluate(() => !!document.getElementById("music-player"))
    );
    await page.evaluate(() =>
      window.Orbit.mount({ widgets: [{ id: "clock", visible: true }] })
    );
    await page.waitForFunction(() => document.getElementById("fwf-clock"));
    check("clock remounts cleanly", true);

    console.log("\n[5] notice close → Launcher OFF + persisted");
    await page.click("#orbit-notice .orbit-notice-close");
    await page.waitForFunction(
      () =>
        (localStorage.getItem("orbit-visible-v1") || "").includes(
          '"notice":false'
        ),
      { timeout: 5000 }
    );
    await page.waitForTimeout(320); // hide transition timer
    check(
      "close hides the card (computed style, runtime CSS injected)",
      await page.evaluate(() => {
        const el = document.getElementById("orbit-notice");
        return (
          !!document.getElementById("orbit-runtime-style") &&
          !!el &&
          getComputedStyle(el).visibility === "hidden"
        );
      })
    );
    check(
      "close keeps instance alive (hide ≠ destroy)",
      await page.evaluate(() => {
        const el = document.getElementById("orbit-notice");
        return (
          !!el &&
          window.Orbit.get("notice").started &&
          window.Orbit.get("notice").visible === false
        );
      })
    );
    check(
      "close persisted preference (orbit-visible-v1 has notice:false)",
      await page.evaluate(() =>
        (localStorage.getItem("orbit-visible-v1") || "").includes(
          '"notice":false'
        )
      )
    );
    await page.evaluate(() => window.Orbit.openLauncher());
    const noticeSwitchOff = await page.evaluate(() => {
      const input = document.querySelector(
        '#orbit-launcher .ol-row[data-id="notice"] input[data-ol-toggle]'
      );
      return input && !input.checked;
    });
    check("launcher switch shows OFF after close", noticeSwitchOff);
    await page.evaluate(() => window.Orbit.closeLauncher());

    // destroy → remount: persisted OFF wins over config default
    await page.evaluate(() => window.Orbit.destroy("notice"));
    await page.waitForFunction(() => !document.getElementById("orbit-notice"));
    await page.evaluate(() =>
      window.Orbit.mount({ widgets: [{ id: "notice", visible: true }] })
    );
    await page.waitForTimeout(300);
    check(
      "persisted OFF survives destroy/remount (not mounted)",
      await page.evaluate(() => {
        const inst = window.Orbit.get("notice");
        return (
          !document.getElementById("orbit-notice") && !!inst && !inst.started
        );
      })
    );
    // re-enable from launcher → mounts and shows
    await page.evaluate(() => window.Orbit.setVisible("notice", true));
    await page.waitForFunction(() => document.getElementById("orbit-notice"), {
      timeout: 5000,
    });
    check(
      "re-enabling from launcher mounts and shows",
      await page.evaluate(() => {
        const el = document.getElementById("orbit-notice");
        return (
          !!el &&
          el.getAttribute("aria-hidden") === "false" &&
          !el.classList.contains("orbit-hidden")
        );
      })
    );

    console.log("\n[5c] custom notice content (config wins over profile)");
    await page.evaluate(() => {
      window.ORBIT.notice = { title: "重要通知", text: "这是自定义公告内容" };
      window.Orbit.destroy("notice");
    });
    await page.waitForFunction(() => !document.getElementById("orbit-notice"));
    await page.evaluate(() =>
      window.Orbit.mount({ widgets: [{ id: "notice", visible: true }] })
    );
    await page.waitForFunction(() => document.getElementById("orbit-notice"));
    check(
      "custom title rendered",
      (await page.textContent("#orbit-notice .orbit-notice-title")) ===
        "重要通知"
    );
    check(
      "custom text rendered despite older profile text",
      (await page.textContent("#orbit-notice .orbit-notice-body")) ===
        "这是自定义公告内容"
    );
    // restore default config for later sections
    await page.evaluate(() => {
      window.ORBIT.notice = {};
      window.Orbit.destroy("notice");
    });
    await page.waitForFunction(() => !document.getElementById("orbit-notice"));
    await page.evaluate(() =>
      window.Orbit.mount({ widgets: [{ id: "notice", visible: true }] })
    );
    await page.waitForFunction(() => document.getElementById("orbit-notice"));

    console.log("\n[6] listener discipline across all three");
    await page.evaluate(() => {
      window.Orbit.destroy("music");
      window.Orbit.destroy("clock");
      window.Orbit.destroy("notice");
    });
    await page.waitForFunction(
      () =>
        !document.getElementById("music-player") &&
        !document.getElementById("fwf-clock") &&
        !document.getElementById("orbit-notice")
    );
    const endStats = await stats(page);
    check(
      "no document listener growth (docNet " +
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

    console.log("\n[7] PJAX / theme body-swap recovery (Runtime-level, M3 fix)");
    // re-mount all three (section [6] destroyed them)
    await page.evaluate(() =>
      window.Orbit.mount({
        widgets: [
          { id: "music", visible: true },
          { id: "clock", visible: true },
          { id: "notice", visible: true },
        ],
      })
    );
    await page.waitForFunction(
      () =>
        document.getElementById("music-player") &&
        document.getElementById("fwf-clock") &&
        document.getElementById("orbit-notice"),
      { timeout: 5000 }
    );
    // hide notice so we can assert hide-state survives a body swap
    await page.evaluate(() => window.Orbit.setVisible("notice", false));
    await page.waitForTimeout(320);
    // simulate PJAX: strip widget roots (+ music portal) from body
    await page.evaluate(() => {
      ["music-player", "mp-dock-list", "fwf-clock", "orbit-notice"].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el && el.parentNode) el.parentNode.removeChild(el);
        }
      );
      document.dispatchEvent(new CustomEvent("pjax:complete"));
    });
    await page.waitForFunction(
      () =>
        document.getElementById("music-player") &&
        document.getElementById("mp-dock-list") &&
        document.getElementById("fwf-clock") &&
        document.getElementById("orbit-notice"),
      { timeout: 5000 }
    );
    check(
      "PJAX swap: all three roots + claimed portal restored by Runtime recovery",
      true
    );
    check(
      "hidden notice keeps hide state after restore",
      await page.evaluate(() => {
        const el = document.getElementById("orbit-notice");
        return (
          !!el &&
          el.classList.contains("orbit-hidden") &&
          document.body.contains(el)
        );
      })
    );
    // destroyed instances must never revive
    await page.evaluate(() => window.Orbit.destroy("clock"));
    await page.waitForFunction(() => !document.getElementById("fwf-clock"));
    await page.evaluate(() => {
      // provoke another body mutation after destroy
      const spacer = document.createElement("div");
      document.body.appendChild(spacer);
      spacer.remove();
    });
    await page.waitForTimeout(400);
    check(
      "destroyed clock does not revive on later body changes",
      await page.evaluate(() => !document.getElementById("fwf-clock"))
    );
    await page.evaluate(() => window.Orbit.setVisible("notice", true));

    console.log("\n[8] visibility preference persists across reload");
    await page.evaluate(() => window.Orbit.setVisible("music", false));
    await page.waitForTimeout(320);
    await page.reload();
    await page.waitForFunction(
      () =>
        document.getElementById("fwf-clock") &&
        document.getElementById("orbit-notice"),
      { timeout: 10000 }
    );
    await page.waitForTimeout(300);
    check(
      "music stays OFF after reload (persisted preference wins over config)",
      await page.evaluate(() => {
        const inst = window.Orbit.get("music");
        return (
          !document.getElementById("music-player") &&
          !!inst &&
          inst.visible === false
        );
      })
    );
    check(
      "clock + notice still ON after reload",
      await page.evaluate(() => {
        const c = window.Orbit.get("clock");
        const n = window.Orbit.get("notice");
        return (
          !!document.getElementById("fwf-clock") &&
          !!document.getElementById("orbit-notice") &&
          c.visible === true &&
          n.visible === true
        );
      })
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
