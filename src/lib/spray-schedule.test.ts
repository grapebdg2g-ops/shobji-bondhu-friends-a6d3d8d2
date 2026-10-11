import { describe, expect, test } from "bun:test";
import { applyGapSchedule, buildSpraySchedule } from "./spray-schedule";
import { FARMING_STAGES } from "@/data/farming-guide";
import { isSprayAllowedUnderGap } from "@/data/gap-protocol";

describe("GAP spray schedule", () => {
  test("no chemical spray remains inside the GAP PHI window", () => {
    const crop = "টমেটো";
    const harvest = FARMING_STAGES[crop].totalDays;
    const gap = applyGapSchedule(buildSpraySchedule(crop, "2026-01-01"), crop);
    const blocked = gap.filter((e) => !isSprayAllowedUnderGap(crop, harvest - e.day));
    expect(blocked.length).toBeGreaterThan(0);
    for (const e of blocked) expect(e.problem).toBeUndefined();
  });
});
