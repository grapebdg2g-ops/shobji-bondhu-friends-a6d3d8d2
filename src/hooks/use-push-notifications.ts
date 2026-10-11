import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getVapidPublicKey,
  savePushSubscription,
  deletePushSubscription,
  hasPushSubscription,
} from "@/lib/weather.functions";
import { useUser } from "@/contexts/user-context";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export type PushStatus = "loading" | "unsupported" | "enabled" | "disabled" | "denied";

export function usePushNotifications() {
  const { user } = useUser();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  const fetchKey = useServerFn(getVapidPublicKey);
  const saveSub = useServerFn(savePushSubscription);
  const deleteSub = useServerFn(deletePushSubscription);
  const checkSub = useServerFn(hasPushSubscription);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const refresh = useCallback(async () => {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    if (!user) {
      setStatus("disabled");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const { hasSubscription } = await checkSub({});
      setStatus(
        sub && hasSubscription && Notification.permission === "granted" ? "enabled" : "disabled",
      );
    } catch {
      setStatus("disabled");
    }
  }, [supported, user, checkSub]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported || !user) return false;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "disabled");
        return false;
      }

      const { publicKey } = await fetchKey({});
      if (!publicKey) throw new Error("VAPID public key not configured");

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });
      }
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const endpoint = sub.endpoint || json.endpoint!;
      const p256dh = json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh"));
      const auth = json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth"));

      await saveSub({
        data: {
          endpoint,
          p256dh,
          auth,
          district: user.district ?? null,
          upazila: user.upazila ?? null,
          user_agent: navigator.userAgent.slice(0, 512),
        },
      });
      setStatus("enabled");
      return true;
    } catch (e) {
      console.error("push enable failed", e);
      setStatus("disabled");
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, user, fetchKey, saveSub]);

  const disable = useCallback(async () => {
    if (!supported) return false;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      await deleteSub({ data: endpoint ? { endpoint } : {} });
      setStatus("disabled");
      return true;
    } catch (e) {
      console.error("push disable failed", e);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, deleteSub]);

  return { status, supported, busy, enable, disable, refresh };
}
