import { describe, expect, it } from "bun:test";
import { normalizeBdPhone } from "./bd-phone";
describe("normalizeBdPhone", () => {
  it("adds +880 to local 01 numbers", () => expect(normalizeBdPhone("01712345678")).toBe("+8801712345678"));
  it("accepts Bangla digits", () => expect(normalizeBdPhone("০১৭১২৩৪৫৬৭৮")).toBe("+8801712345678"));
  it("keeps +880 numbers", () => expect(normalizeBdPhone("+880 1712-345678")).toBe("+8801712345678"));
  it("rejects short numbers", () => expect(normalizeBdPhone("01712")).toBeNull());
});
