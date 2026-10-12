import { describe, expect, it } from "vitest";
import { isTaskDone, legacyUpgrades, stableTaskId } from "./task-id";

describe("stable task ids", () => {
  it("does not depend on task position", () => {
    expect(stableTaskId("seedling", "সেচ দিন")).toBe(stableTaskId("seedling", "সেচ দিন"));
    expect(stableTaskId("seedling", "সেচ দিন")).not.toBe(stableTaskId("seedling", "সার দিন"));
  });
  it("still honours old index-based ticks", () => {
    expect(isTaskDone(new Set(["seedling::1"]), "seedling", "x", 1)).toBe(true);
    expect(isTaskDone(new Set(["seedling::1"]), "seedling", "x", 0)).toBe(false);
  });
  it("lists old ticks to re-save under the stable id", () => {
    const stages = [{ id: "s", tasks: [{ title: "a" }, { title: "b" }] }];
    expect(legacyUpgrades(new Set(["s::1"]), stages)).toEqual([stableTaskId("s", "b")]);
  });
});
