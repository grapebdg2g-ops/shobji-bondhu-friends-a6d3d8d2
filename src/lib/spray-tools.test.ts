import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseDosePerLiter, tankPlan, phiConflict, mixRank, tankMixWarnings } from "./spray-tools";

describe("spray tools", () => {
  it("parses Bengali dose per litre", () => {
    assert.deepEqual(parseDosePerLiter("০.৫ গ্রাম / লিটার পানি"), { amount: 0.5, unit: "গ্রাম" });
  });
  it("20 shotok needs 40 L = 3 tanks of 16 L, 16 ml per tank at 1 ml/L", () => {
    const p = tankPlan(20, 1);
    assert.equal(p.waterLiters, 40);
    assert.equal(p.tanks, 3);
    assert.equal(p.perTank, 16);
  });
  it("flags spraying 5 days before harvest with 7-day PHI", () => {
    assert.equal(phiConflict(85, 90, 7).conflict, true);
    assert.equal(phiConflict(80, 90, 7).conflict, false);
  });
  it("WG goes before EC in mixing order", () => {
    assert.ok(mixRank("থায়ামেথক্সাম ২৫ ডব্লিউজি") < mixRank("এবামেক্টিন ১.৮ ইসি"));
  });
  it("warns when copper is mixed with another product", () => {
    assert.equal(tankMixWarnings(["কপার অক্সিক্লোরাইড", "ইমিডাক্লোপ্রিড"]).length > 0, true);
  });
});
