import { describe, expect, it } from "bun:test";
import { summarize, perUnit } from "./crop-finance";

const r = (entry_type: any, amount: number, is_settled = false) => ({ entry_type, amount, is_settled });

describe("crop finance", () => {
  it("credit purchase counts as cost and stays payable until settled", () => {
    const s = summarize([r("credit_purchase", 1000), r("credit_purchase", 500, true)]);
    expect(s.totalCost).toBe(1500);
    expect(s.payable).toBe(1000);
  });
  it("credit sale counts as income and stays receivable until settled", () => {
    const s = summarize([r("credit_sale", 2000), r("income", 1000)]);
    expect(s.totalIncome).toBe(3000);
    expect(s.receivable).toBe(2000);
  });
  it("withdrawal reduces cash but not profit", () => {
    const s = summarize([r("capital", 5000), r("income", 3000), r("expense", 1000), r("withdrawal", 2000)]);
    expect(s.profit).toBe(2000);
    expect(s.cashInHand).toBe(5000);
  });
  it("per unit is null without land", () => {
    expect(perUnit(100, null)).toBeNull();
    expect(perUnit(100, 20)).toBe(5);
  });
});
