import { usesSeparatePushSender, wasPushDelivered } from "./push-policy";

export const PUSH_PAGE_SIZE = 200;

type PendingNotification = { id: string; user_id: string; type: string };
type Subscription = { user_id: string };

/** Keyset pagination keeps skipped/failed rows from occupying the only queue window.
 * A fixed upper bound in loadPage keeps concurrent inserts out of this traversal.
 */
export async function dispatchPendingPushes<
  N extends PendingNotification,
  S extends Subscription,
>(options: {
  loadPage: (cursor: N | undefined) => Promise<N[]>;
  loadSubscriptions: (userIds: string[]) => Promise<S[]>;
  send: (notification: N, subscription: S) => Promise<{ ok: boolean }>;
  markDelivered: (notification: N) => Promise<void>;
}) {
  let cursor: N | undefined;
  let sent = 0;
  let delivered = 0;
  let pending = 0;
  for (;;) {
    const page = await options.loadPage(cursor);
    if (!page.length) break;
    const todo = page.filter((n) => !usesSeparatePushSender(n.type));
    const userIds = [...new Set(todo.map((n) => n.user_id))];
    const subscriptions = userIds.length ? await options.loadSubscriptions(userIds) : [];
    for (const notification of todo) {
      const mine = subscriptions.filter((s) => s.user_id === notification.user_id);
      const results: { ok: boolean }[] = [];
      // Respect the deployed runtime's six-outbound-connection limit.
      for (let start = 0; start < mine.length; start += 6) {
        results.push(...await Promise.all(mine.slice(start, start + 6).map(async (subscription) => {
          try {
            return await options.send(notification, subscription);
          } catch {
            return { ok: false };
          }
        })));
      }
      sent += results.filter((result) => result.ok).length;
      if (wasPushDelivered(results)) {
        await options.markDelivered(notification);
        delivered += 1;
      } else {
        // No device or all sends failed: retain for a later dispatch, but keep scanning.
        pending += 1;
      }
    }
    cursor = page[page.length - 1];
    if (page.length < PUSH_PAGE_SIZE) break;
  }
  return { sent, delivered, pending };
}