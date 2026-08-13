/**
 * Smoke tests for normalize() — run with:
 *   node src/core/state.normalize.test.js
 * (Node 18+ for structuredClone; otherwise JSON path is used)
 */

import { createInitialState, normalize, createState } from "./State.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("OK  ", msg);
  }
}

// 1. default is BALL
{
  const s = createInitialState();
  assert(s.mode === "BALL", "default mode is BALL");
  assert(s.dock.expanded === false, "default dock.expanded false");
}

// 2. PANEL + dragging → BALL, list closed
{
  const raw = createInitialState({
    mode: "PANEL",
    layout: { listOpen: true },
    interaction: { dragging: true },
  });
  const s = normalize(raw);
  assert(s.mode === "BALL", "PANEL+dragging → BALL");
  assert(s.layout.listOpen === false, "dragging closes list");
}

// 3. dock.expanded only when DOCK
{
  const raw = createInitialState({
    mode: "BALL",
    dock: { expanded: true, side: "left" },
  });
  const s = normalize(raw);
  assert(s.dock.expanded === false, "expanded cleared when not DOCK");
}

// 4. DOCK clears expandLeft
{
  const raw = createInitialState({
    mode: "DOCK",
    dock: { enabled: true, side: "right", expanded: true },
    layout: { expandLeft: true },
  });
  const s = normalize(raw);
  assert(s.layout.expandLeft === false, "DOCK clears expandLeft");
  assert(s.dock.expanded === true, "DOCK allows expanded");
}

// 5. closing forces expanded false
{
  const raw = createInitialState({
    mode: "DOCK",
    dock: { enabled: true, side: "left", expanded: true, closing: true },
  });
  const s = normalize(raw);
  assert(s.dock.expanded === false, "closing → expanded false");
  assert(s.dock.closing === true, "closing preserved");
}

// 6. patch API works and notifies
{
  let called = false;
  const store = createState();
  store.subscribe(() => {
    called = true;
  });
  store.patch({ mode: "PANEL" });
  assert(store.get().mode === "PANEL", "patch sets PANEL");
  assert(called, "subscriber called");
}

// 7. invalid mode → BALL
{
  const s = normalize(createInitialState({ mode: "NOPE" }));
  assert(s.mode === "BALL", "invalid mode → BALL");
}

console.log("\nnormalize smoke tests finished.");
