import { test, expect } from "bun:test";
import { mentionsPrice, normalizePrice, isPlausible } from "./price-from-text";

test("৮০০ টাকা মণ = ২০ টাকা কেজি", () => {
  expect(normalizePrice({ product_name: "টমেটো", price: 800, unit: "মণ", price_type: "wholesale" })).toEqual({ price: 20, unit: "কেজি" });
});

test("কেজির দাম অপরিবর্তিত থাকে", () => {
  expect(normalizePrice({ product_name: "টমেটো", price: 20, unit: "কেজি", price_type: "wholesale" })).toEqual({ price: 20, unit: "কেজি" });
});

test("বাংলা সংখ্যা ও টাকা থাকলে দাম শনাক্ত হয়", () => {
  expect(mentionsPrice("আজকে আমার এখানে টমেটো পাইকারী ২০ টাকা কেজি")).toBe(true);
  expect(mentionsPrice("আজকে বৃষ্টি হচ্ছে")).toBe(false);
});

test("অসম্ভব দাম বাতিল", () => {
  expect(isPlausible(0)).toBe(false);
  expect(isPlausible(20)).toBe(true);
});
