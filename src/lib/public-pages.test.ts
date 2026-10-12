import { describe, it } from "node:test";
import assert from "node:assert/strict";
const expect = (actual: unknown) => ({ toBe: (expected: unknown) => assert.equal(actual, expected) });
import { isPublicPage } from "./public-pages";
describe("public pages", () => {
  it("allows the introduction without login", () => expect(isPublicPage("/")).toBe(true));
  it("allows market prices without login", () => expect(isPublicPage("/prices")).toBe(true));
  it("allows crop guides without login", () => {
    expect(isPublicPage("/vegetable-guide")).toBe(true);
    expect(isPublicPage("/vegetable-guide/tomato")).toBe(true);
  });
  it("does not make personal plans public", () => expect(isPublicPage("/crop-guide/plan/example")).toBe(false));
});