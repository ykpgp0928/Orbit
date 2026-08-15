/**
 * LifecycleScope unit tests — Phase 1
 * Run: npm run test:unit
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createLifecycleScope } from "./LifecycleScope.js";

describe("LifecycleScope", () => {
  it("runs cleanups in reverse order", async () => {
    const scope = createLifecycleScope();
    const order = [];
    scope.add(() => {
      order.push("a");
    });
    scope.add(() => {
      order.push("b");
    });
    scope.add(() => {
      order.push("c");
    });
    await scope.dispose();
    assert.deepEqual(order, ["c", "b", "a"]);
  });

  it("dispose is idempotent", async () => {
    const scope = createLifecycleScope();
    let n = 0;
    scope.add(() => {
      n += 1;
    });
    await scope.dispose();
    await scope.dispose();
    await scope.dispose();
    assert.equal(n, 1);
    assert.equal(scope.disposed, true);
  });

  it("one throwing cleanup does not block others", async () => {
    const scope = createLifecycleScope();
    const order = [];
    const errors = [];
    scope.add(() => {
      order.push("first-registered");
    });
    scope.add(() => {
      order.push("throws");
      throw new Error("boom");
    });
    scope.add(() => {
      order.push("last-registered");
    });
    await scope.dispose(function (err) {
      errors.push(err);
    });
    // reverse: last-registered, throws, first-registered
    assert.deepEqual(order, ["last-registered", "throws", "first-registered"]);
    assert.equal(errors.length, 1);
    assert.match(String(errors[0] && errors[0].message), /boom/);
  });

  it("add after dispose runs fn asynchronously and returns no-op remove", async () => {
    const scope = createLifecycleScope();
    await scope.dispose();
    let ran = false;
    const remove = scope.add(() => {
      ran = true;
    });
    remove();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(ran, true);
  });

  it("remove() before dispose skips that cleanup", async () => {
    const scope = createLifecycleScope();
    const order = [];
    const rm = scope.add(() => {
      order.push("skip-me");
    });
    scope.add(() => {
      order.push("keep");
    });
    rm();
    await scope.dispose();
    assert.deepEqual(order, ["keep"]);
  });
});
