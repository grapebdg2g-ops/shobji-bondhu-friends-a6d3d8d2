import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getVapidPublicKey,
  savePushSubscription,
  deletePushSubscription,
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

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    window.self === window.top &&
    import.meta.env.PROD &&
    !window.location.hostname.includes("id-preview");

  const persistSubscription = useCallback(async (sub: PushSubscription) => {
    if (!user) return;
    const json = sub.toJSON();
    await saveSub({ data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? arrayBufferToBase64(sub.getKey("p256dh")),
      auth: json.keys?.auth ?? arrayBufferToBase64(sub.getKey("auth")),
      district: user.district ?? null,
      upazila: user.upazila ?? null,
      user_agent: navigator.userAgent.slice(0, 512),
    } });
  }, [user, saveSub]);

  const registerDevice = useCallback(async () => {
    const { publicKey } = await fetchKey({});
    if (!publicKey) throw new Error("VAPID public key not configured");
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Push registration timed out")), 15000)),
    ]);
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });
    await persistSubscription(sub);
  }, [fetchKey, persistSubscription]);

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
    if (localStorage.getItem("pushOptedOut") === "true") {
      setStatus("disabled");
      return;
    }
    if (Notification.permission !== "granted") {
      setStatus("disabled");
      return;
    }
    try {
      await registerDevice();
      setStatus("enabled");
    } catch {
      setStatus("disabled");
    }
  }, [supported, user, registerDevice]);

  useEffect(() => {
    refresh();
    const onOnline = () => { void refresh(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!supported || !user) return false;
    setBusy(true);
    try {
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "disabled");
        return false;
      }

      localStorage.removeItem("pushOptedOut");
      await registerDevice();
      setStatus("enabled");
      return true;
    } catch (e) {
      console.error("push enable failed", e);
      setStatus("disabled");
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, user, registerDevice]);

  const disable = useCallback(async () => {
    if (!supported) return false;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      await deleteSub({ data: endpoint ? { endpoint } : {} });
      localStorage.setItem("pushOptedOut", "true");
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
