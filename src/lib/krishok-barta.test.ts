import { expect, test } from "bun:test";
import { isDhakaNewsToday, parseNewsSelection } from "./krishok-barta";

test("daily news uses today's Bangladesh date, not the previous 24 hours", () => {
  const now = new Date("2026-11-14T02:00:00Z");
  expect(isDhakaNewsToday("2026-11-13T18:01:00Z", now)).toBe(true);
  expect(isDhakaNewsToday("2026-11-13T17:59:00Z", now)).toBe(false);
  expect(isDhakaNewsToday("invalid", now)).toBe(false);
  expect(isDhakaNewsToday("2026-11-14T03:00:00Z", now)).toBe(false);
});

test("news selection must identify one of the supplied headlines", () => {
  expect(parseNewsSelection('{"index":1,"summary":"কৃষি সংবাদ"}', 2).success).toBe(true);
  expect(parseNewsSelection('{"index":3,"summary":"কৃষি সংবাদ"}', 2).success).toBe(false);
  expect(parseNewsSelection('{"index":1.5,"summary":"কৃষি সংবাদ"}', 2).success).toBe(false);
});