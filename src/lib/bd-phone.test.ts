import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeBdPhone } from "./bd-phone";
describe("normalizeBdPhone", () => {
  it("adds +880 to local 01 numbers", () => assert.equal(normalizeBdPhone("01712345678"), "+8801712345678"));
  it("accepts Bangla digits", () => assert.equal(normalizeBdPhone("০১৭১২৩৪৫৬৭৮"), "+8801712345678"));
  it("keeps +880 numbers", () => assert.equal(normalizeBdPhone("+880 1712-345678"), "+8801712345678"));
  it("rejects short numbers", () => assert.equal(normalizeBdPhone("01712"), null));
});
