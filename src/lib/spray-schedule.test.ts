import { describe, expect, test } from "bun:test";
import { applyGapSchedule, buildSpraySchedule } from "./spray-schedule";
import { FARMING_STAGES } from "@/data/farming-guide";
import { GAP_CROPS, isSprayAllowedUnderGap } from "@/data/gap-protocol";

describe("GAP spray schedule", () => {
  test("chemical sprays inside the GAP PHI window are replaced by bio alternatives", () => {
    let blockedTotal = 0;
    for (const crop of Object.keys(GAP_CROPS)) {
      const harvest = FARMING_STAGES[crop]?.totalDays;
      if (!harvest) continue;
      const base = buildSpraySchedule(crop, "2026-01-01");
      const gap = applyGapSchedule(base, crop);
      base.forEach((e, i) => {
        if (e.problem && !isSprayAllowedUnderGap(crop, harvest - e.day)) {
          blockedTotal++;
          expect(gap[i].problem).toBeUndefined();
          expect(gap[i].title.startsWith("জৈব বিকল্প")).toBe(true);
        }
      });
    }
    expect(blockedTotal).toBeGreaterThan(0);
  });
});
