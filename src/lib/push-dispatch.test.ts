import { expect, test } from "bun:test";
import { dispatchPendingPushes, PUSH_PAGE_SIZE } from "./push-dispatch";

type Alert = { id: string; user_id: string; type: string };
type Device = { user_id: string; endpoint: string };

function harness(alerts: Alert[], devices: Device[], failures: string[] = []) {
  const receipts = new Set<string>();
  const sends: string[] = [];
  const pages: (string | undefined)[] = [];
  return {
    receipts, sends, pages,
    run: () => dispatchPendingPushes({
      loadPage: async (cursor: Alert | undefined) => {
        pages.push(cursor?.id);
        const start = cursor ? alerts.findIndex((n) => n.id === cursor.id) + 1 : 0;
        return alerts.slice(start).filter((n) => !receipts.has(n.id)).slice(0, PUSH_PAGE_SIZE);
      },
      loadSubscriptions: async (userIds) => devices.filter((s) => userIds.includes(s.user_id)),
      send: async (n, s) => {
        sends.push(`${n.id}:${s.endpoint}`);
        return { ok: !failures.includes(s.endpoint) };
      },
      markDelivered: async (n) => { receipts.add(n.id); },
    }),
  };
}

test("200 separately-sent group/weather alerts cannot block a crop reminder or DM", async () => {
  const old = Array.from({ length: 200 }, (_, i) => ({
    id: `old-${i}`, user_id: "member", type: i % 2 ? "weather_rain" : "group_message",
  }));
  const h = harness([...old,
    { id: "crop", user_id: "farmer", type: "crop_reminder" },
    { id: "dm", user_id: "farmer", type: "message" },
    { id: "ipm", user_id: "farmer", type: "ipm_weather" },
  ], [{ user_id: "farmer", endpoint: "phone" }]);
  expect(await h.run()).toEqual({ sent: 3, delivered: 3, pending: 0 });
  expect([...h.receipts]).toEqual(["crop", "dm", "ipm"]);
  expect(h.sends).toEqual(["crop:phone", "dm:phone", "ipm:phone"]);
});

test("200 unsubscribed alerts remain pending without blocking a subscribed farmer", async () => {
  const h = harness([
    ...Array.from({ length: 200 }, (_, i) => ({ id: `no-device-${i}`, user_id: "guest", type: "message" })),
    { id: "crop", user_id: "farmer", type: "crop_reminder" },
  ], [{ user_id: "farmer", endpoint: "phone" }]);
  expect(await h.run()).toEqual({ sent: 1, delivered: 1, pending: 200 });
  expect([...h.receipts]).toEqual(["crop"]);
  expect(h.pages).toEqual([undefined, "no-device-199"]);
});

test("failed endpoints in the first page cannot starve later notifications", async () => {
  const h = harness([
    ...Array.from({ length: 200 }, (_, i) => ({ id: `failed-${i}`, user_id: "offline", type: "message" })),
    { id: "dm", user_id: "online", type: "message" },
  ], [{ user_id: "offline", endpoint: "bad" }, { user_id: "online", endpoint: "good" }], ["bad"]);
  expect(await h.run()).toEqual({ sent: 1, delivered: 1, pending: 200 });
  expect([...h.receipts]).toEqual(["dm"]);
});

test("a partial success is not replayed on the next dispatch", async () => {
  const h = harness([{ id: "dm", user_id: "farmer", type: "message" }], [
    { user_id: "farmer", endpoint: "phone" }, { user_id: "farmer", endpoint: "offline-tablet" },
  ], ["offline-tablet"]);
  expect(await h.run()).toEqual({ sent: 1, delivered: 1, pending: 0 });
  expect(await h.run()).toEqual({ sent: 0, delivered: 0, pending: 0 });
  expect(h.sends).toEqual(["dm:phone", "dm:offline-tablet"]);
});

test("wholly failed delivery is retried and marked only after a successful send", async () => {
  const failures = ["phone"];
  const h = harness([{ id: "crop", user_id: "farmer", type: "crop_reminder" }], [
    { user_id: "farmer", endpoint: "phone" },
  ], failures);
  expect(await h.run()).toEqual({ sent: 0, delivered: 0, pending: 1 });
  expect(h.receipts.size).toBe(0);
  failures.length = 0;
  expect(await h.run()).toEqual({ sent: 1, delivered: 1, pending: 0 });
  expect(h.receipts.has("crop")).toBe(true);
});

test("keyset paging does not skip alerts when delivered rows disappear", async () => {
  const h = harness(Array.from({ length: 401 }, (_, i) => ({
    id: `dm-${i}`, user_id: "farmer", type: "message",
  })), [{ user_id: "farmer", endpoint: "phone" }]);
  expect(await h.run()).toEqual({ sent: 401, delivered: 401, pending: 0 });
  expect(h.receipts.size).toBe(401);
  expect(h.pages).toEqual([undefined, "dm-199", "dm-399"]);
});

test("push concurrency never exceeds six connections for many devices", async () => {
  let active = 0;
  let maximum = 0;
  const n = { id: "crop", user_id: "farmer", type: "crop_reminder" };
  const result = await dispatchPendingPushes({
    loadPage: async () => [n],
    loadSubscriptions: async () => Array.from({ length: 20 }, () => ({ user_id: "farmer" })),
    send: async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { ok: true };
    },
    markDelivered: async () => {},
  });
  expect(result.sent).toBe(20);
  expect(maximum).toBe(6);
});