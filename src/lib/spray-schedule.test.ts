import { describe, expect, test } from "bun:test";
import { applyGapSchedule, buildSpraySchedule, type SprayEvent } from "./spray-schedule";
import { FARMING_STAGES } from "@/data/farming-guide";
import { PESTICIDE_GUIDE } from "@/data/pesticide-guide";

describe("GAP spray schedule", () => {
  test("a chemical spray right before harvest becomes a bio alternative under GAP", () => {
    const crop = "টমেটো";
    const harvest = FARMING_STAGES[crop].totalDays;
    const problem = Object.values(PESTICIDE_GUIDE).flat().find((p) => p && "chemicals" in p) as SprayEvent["problem"];
    const late: SprayEvent = { ...buildSpraySchedule(crop, "2026-01-01")[0], day: harvest - 1, problem };
    const [out] = applyGapSchedule([late], crop);
    expect(out.problem).toBeUndefined();
    expect(out.title.startsWith("জৈব বিকল্প")).toBe(true);
  });
});
