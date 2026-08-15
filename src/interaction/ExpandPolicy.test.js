/**
 * ExpandPolicy pure-function tests — Phase 6
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveExpandDirection,
  resolveDockStackDirection,
  expandDownTranslateY,
} from "./ExpandPolicy.js";

describe("ExpandPolicy.resolveExpandDirection", () => {
  it("expands right when open width fits", () => {
    const r = resolveExpandDirection({
      absLeft: 20,
      absTop: 100,
      ballW: 56,
      ballH: 56,
      openW: 200,
      openH: 160,
      viewportW: 400,
      viewportH: 800,
      pad: 8,
    });
    assert.equal(r.expandLeft, false);
  });

  it("expands left when right side overflows", () => {
    const r = resolveExpandDirection({
      absLeft: 250,
      absTop: 100,
      ballW: 56,
      ballH: 56,
      openW: 200,
      openH: 160,
      viewportW: 400,
      viewportH: 800,
      pad: 8,
    });
    assert.equal(r.expandLeft, true);
  });

  it("dock right forces expandLeft", () => {
    const r = resolveExpandDirection({
      absLeft: 0,
      absTop: 0,
      ballW: 56,
      ballH: 56,
      openW: 100,
      openH: 80,
      viewportW: 400,
      viewportH: 800,
      dockSide: "right",
      pad: 8,
    });
    assert.equal(r.expandLeft, true);
  });
});

describe("ExpandPolicy.resolveDockStackDirection", () => {
  it("stacks down when more space below", () => {
    const r = resolveDockStackDirection({
      absTop: 10,
      absBottom: 60,
      stackH: 200,
      viewportH: 800,
      pad: 8,
    });
    assert.equal(r.dockDown, true);
  });
});

describe("ExpandPolicy.expandDownTranslateY", () => {
  it("returns 0 when closed or not expandDown", () => {
    assert.equal(expandDownTranslateY(false, true, 56, 160), 0);
    assert.equal(expandDownTranslateY(true, false, 56, 160), 0);
  });

  it("returns positive offset when open+expandDown", () => {
    const y = expandDownTranslateY(true, true, 56, 160);
    assert.ok(y > 0);
  });
});
