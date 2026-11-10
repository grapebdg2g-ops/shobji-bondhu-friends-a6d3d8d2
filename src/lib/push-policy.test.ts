import { expect, test } from "bun:test";
import { shouldPromptForPush, wasPushDelivered } from "./push-policy";

test("an already allowed device never asks again, even without a server subscription", () => {
  expect(shouldPromptForPush("granted", 0, 1000)).toBe(false);
});
test("a denied or intentionally disabled device never prompts automatically", () => {
  expect(shouldPromptForPush("denied", 0, 1000)).toBe(false);
  expect(shouldPromptForPush("default", 0, 1000, true)).toBe(false);
});
test("later snoozes prompts across visits for three days", () => {
  expect(shouldPromptForPush("default", 1000, 1000 + 3 * 86400000 - 1)).toBe(false);
  expect(shouldPromptForPush("default", 1000, 1000 + 3 * 86400000)).toBe(true);
});
test("failed delivery is not marked sent", () => {
  expect(wasPushDelivered([{ ok: false }])).toBe(false);
  expect(wasPushDelivered([{ ok: true }, { ok: false }])).toBe(false);
  expect(wasPushDelivered([])).toBe(false);
  expect(wasPushDelivered([{ ok: true }])).toBe(true);
});