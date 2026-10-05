import { describe, expect, it } from "vitest";
import { checkResistance, getChemicalInfo, getPhiDays, findCrop, getIrrigationAdvice, getIpmRules } from "./crop-knowledge";

describe("crop knowledge", () => {
  it("maps Vertimec to abamectin IRAC 6 with 7-day PHI", () => {
    const a = getChemicalInfo("এবামেক্টিন ১.৮ ইসি (ভার্টিম্যাক — সিনজেন্টা)")!;
    expect(a.system).toBe("IRAC");
    expect(a.group).toBe("6");
    expect(a.phiDays).toBe(7);
  });

  it("combined product uses the longest PHI", () => {
    expect(getPhiDays("দামার (ফিপ্রোনিল ৪০% + থায়ামেথক্সাম ২০%)")).toBe(14);
  });

  it("warns on same IRAC group used twice in a row", () => {
    const w = checkResistance(["ইমিডাক্লোপ্রিড", "থায়ামেথক্সাম"]);
    expect(w[0].groupKey).toBe("IRAC-4A");
  });

  it("does not warn for rotated groups or multi-site fungicides", () => {
    expect(checkResistance(["ইমিডাক্লোপ্রিড", "এবামেক্টিন", "থায়ামেথক্সাম"])).toEqual([]);
    expect(checkResistance(["ম্যানকোজেব", "ম্যানকোজেব"])).toEqual([]);
  });

  it("rice uses AWD irrigation", () => {
    const rice = findCrop("বোরো ধান")!;
    expect(getIrrigationAdvice(rice, rice.stages[0]).method).toContain("AWD");
  });

  it("fruit fly rule applies to watermelon but not rice", () => {
    expect(getIpmRules(findCrop("তরমুজ")!).some((r) => r.id === "fruitfly")).toBe(true);
    expect(getIpmRules(findCrop("বোরো ধান")!).some((r) => r.id === "fruitfly")).toBe(false);
  });
});
