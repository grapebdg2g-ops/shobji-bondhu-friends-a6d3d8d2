export const NOTIFICATION_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldPromptForPush(permission: NotificationPermission, dismissedAt: number, now: number, optedOut = false) {
  return permission === "default" && !optedOut && (!dismissedAt || now - dismissedAt >= NOTIFICATION_SNOOZE_MS);
}

export function wasPushDelivered(results: { ok: boolean }[]) {
  return results.length > 0 && results.every((result) => result.ok);
}