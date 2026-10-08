import { it } from "node:test";
import assert from "node:assert/strict";
import { mentionsPrice, normalizePrice, isPlausible } from "./price-from-text";

it("৮০০ টাকা মণ = ২০ টাকা কেজি", () => {
  assert.deepEqual(normalizePrice({ product_name: "টমেটো", price: 800, unit: "মণ", price_type: "wholesale" }), { price: 20, unit: "কেজি" });
});

it("কেজির দাম অপরিবর্তিত থাকে", () => {
  assert.deepEqual(normalizePrice({ product_name: "টমেটো", price: 20, unit: "কেজি", price_type: "wholesale" }), { price: 20, unit: "কেজি" });
});

it("বাংলা সংখ্যা ও টাকা থাকলে দাম শনাক্ত হয়", () => {
  assert.equal(mentionsPrice("আজকে আমার এখানে টমেটো পাইকারী ২০ টাকা কেজি"), true);
  assert.equal(mentionsPrice("আজকে বৃষ্টি হচ্ছে"), false);
});

it("অসম্ভব দাম বাতিল", () => {
  assert.equal(isPlausible(0), false);
  assert.equal(isPlausible(20), true);
});
