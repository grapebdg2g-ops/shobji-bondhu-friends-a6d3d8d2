import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAllCrops } from "@/data/master-crop-data";
import { PESTICIDE_GUIDE } from "@/data/pesticide-guide";
import { getAllChemicalInfo } from "@/data/crop-knowledge";
import { buildSpraySchedule, applyPhiSafety, harvestStartFor } from "@/lib/spray-schedule";
import { stageAtDay } from "@/lib/crop-stage";
import { FARMING_STAGES } from "@/data/farming-guide";

describe("crop catalog invariants", () => {
  for (const c of getAllCrops()) {
    it(`${c.name}: stages cover 0..totalDays with no gaps and every stage has a task`, () => {
      assert.equal(c.stages[0].startDay, 0);
      assert.equal(c.stages.at(-1)!.endDay, c.totalDays);
      for (let i = 1; i < c.stages.length; i++)
        assert.equal(c.stages[i].startDay, c.stages[i - 1].endDay, c.stages[i].id);
      for (const s of c.stages) assert.ok(s.tasks.length >= 1, s.id);
    });
  }
  it("wheat on day 70 is not yet in the harvest stage", () => {
    const g = FARMING_STAGES["গম"];
    assert.ok(!stageAtDay(g.stages, 70)!.tasks.some((t) => t.type === "harvest"));
  });
  it("every guide chemical has PHI/IRAC/FRAC safety data", () => {
    for (const p of PESTICIDE_GUIDE)
      for (const ch of p.chemicals) assert.ok(getAllChemicalInfo(ch.name).length > 0, ch.name);
  });
  it("boron is no longer listed as a late blight chemical", () => {
    const lb = PESTICIDE_GUIDE.find((p) => p.id === "tomato-lateblight")!;
    assert.ok(!lb.chemicals.some((c) => c.name.includes("বোরন")));
  });
});

describe("tomato schedule and harvest safety", () => {
  const events = applyPhiSafety(buildSpraySchedule("টমেটো", "2026-10-01"), "টমেটো");
  const harvest = harvestStartFor("টমেটো");
  it("no chemical spray lands within 14 days of first harvest", () => {
    for (const e of events) if (e.problem) assert.ok(harvest - e.day > 14, `${e.title} @${e.day}`);
  });
  it("late blight is sprayed at most 3 times a season", () => {
    assert.ok(events.filter((e) => e.problem?.id === "tomato-lateblight").length <= 3);
  });
  it("PHI counts from first harvest, not end of cycle", () => {
    assert.ok(harvest < FARMING_STAGES["টমেটো"].totalDays);
  });
});
