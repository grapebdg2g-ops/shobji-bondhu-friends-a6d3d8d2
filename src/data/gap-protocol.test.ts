import { test } from "node:test";
import assert from "node:assert/strict";
import { GAP_CROPS, buildGapTasks, isSprayAllowedUnderGap } from "./gap-protocol";
import { getAllCrops } from "./master-crop-data";

const REQUESTED = ["টমেটো", "বেগুন", "শসা", "মরিচ", "ক্যাপসিকাম", "আলু", "লাউ", "মিষ্টি কুমড়া", "বাঁধাকপি", "ফুলকপি", "ব্রকলি", "বরবটি", "শিম", "করলা"];

test("every requested GAP crop exists in master catalog and has a GAP profile", () => {
  const names = new Set(getAllCrops().map((c) => c.name));
  for (const n of REQUESTED) {
    assert.ok(names.has(n), `missing crop ${n}`);
    assert.ok(GAP_CROPS[n], `missing GAP profile ${n}`);
  }
});

test("GAP forbids raw manure and red-label pesticides", () => {
  const tasks = buildGapTasks("টমেটো");
  assert.ok(tasks.some((t) => t.desc.includes("কাঁচা গোবর সম্পূর্ণ নিষেধ")));
  assert.ok(tasks.some((t) => t.desc.includes("Class Ia/Ib")));
});

test("chemical spray blocked inside PHI window", () => {
  assert.equal(isSprayAllowedUnderGap("টমেটো", 5), false);
  assert.equal(isSprayAllowedUnderGap("টমেটো", 10), true);
  assert.equal(isSprayAllowedUnderGap("আলু", 14), false);
});
