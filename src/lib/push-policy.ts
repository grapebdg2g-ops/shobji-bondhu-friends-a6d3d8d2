export const NOTIFICATION_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

export function shouldPromptForPush(permission: NotificationPermission, dismissedAt: number, now: number, optedOut = false) {
  return permission === "default" && !optedOut && (!dismissedAt || now - dismissedAt >= NOTIFICATION_SNOOZE_MS);
}

export function wasPushDelivered(results: { ok: boolean }[]) {
  // A notification is delivered when at least one registered device receives it.
  // Replaying it to every device because another endpoint failed creates duplicates.
  return results.some((result) => result.ok);
}

export function usesSeparatePushSender(type: string) {
  return type === "group_message" || type.startsWith("weather_");
}