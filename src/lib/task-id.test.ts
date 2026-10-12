import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTaskDone, legacyUpgrades, stableTaskId } from "./task-id";

describe("stable task ids", () => {
  it("does not depend on task position", () => {
    assert.equal(stableTaskId("seedling", "সেচ দিন"), stableTaskId("seedling", "সেচ দিন"));
    assert.notEqual(stableTaskId("seedling", "সেচ দিন"), stableTaskId("seedling", "সার দিন"));
  });
  it("still honours old index-based ticks", () => {
    assert.equal(isTaskDone(new Set(["seedling::1"]), "seedling", "x", 1), true);
    assert.equal(isTaskDone(new Set(["seedling::1"]), "seedling", "x", 0), false);
  });
  it("lists old ticks to re-save under the stable id", () => {
    const stages = [{ id: "s", tasks: [{ title: "a" }, { title: "b" }] }];
    assert.deepEqual(legacyUpgrades(new Set(["s::1"]), stages), [stableTaskId("s", "b")]);
  });
});
