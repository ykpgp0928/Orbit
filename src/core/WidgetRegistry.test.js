/**
 * WidgetRegistry definition validation — Phase 1
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  registerWidget,
  getWidget,
  listWidgets,
} from "./WidgetRegistry.js";

describe("WidgetRegistry", () => {
  it("rejects missing id or mount", () => {
    assert.throws(() => registerWidget("", { mount() {} }), /id/);
    assert.throws(() => registerWidget("x", {}), /mount/);
    assert.throws(() => registerWidget("x", null), /mount/);
  });

  it("stores definition with label defaulting to id", () => {
    registerWidget("phase1-test-widget", {
      mount() {
        return { destroy() {} };
      },
    });
    const def = getWidget("phase1-test-widget");
    assert.ok(def);
    assert.equal(def.id, "phase1-test-widget");
    assert.equal(def.label, "phase1-test-widget");
    assert.equal(typeof def.mount, "function");
    assert.ok(listWidgets().includes("phase1-test-widget"));
  });

  it("keeps explicit label", () => {
    registerWidget("phase1-labeled", {
      label: "Labeled",
      mount() {
        return { destroy() {} };
      },
    });
    assert.equal(getWidget("phase1-labeled").label, "Labeled");
  });

  it("preserves declared capabilities (M4 fix)", () => {
    registerWidget("phase1-caps", {
      label: "Caps",
      version: "0.4",
      capabilities: { launcher: true, profile: false, draggable: false },
      mount() {
        return { destroy() {} };
      },
    });
    const def = getWidget("phase1-caps");
    assert.deepEqual(def.capabilities, {
      launcher: true,
      profile: false,
      draggable: false,
    });
    assert.equal(def.version, "0.4");
  });
});
