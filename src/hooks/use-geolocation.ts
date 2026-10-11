import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "geo:lastpos";

export type GeoPos = { lat: number; lng: number; accuracy: number; ts: number };
export type GeoStatus =
  | "idle"
  | "prompt"
  | "loading"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

export function useGeolocation(autoRequest = true) {
  const [pos, setPos] = useState<GeoPos | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as GeoPos;
      // Use cache if < 1 hour old
      if (Date.now() - p.ts < 60 * 60_000) return p;
      return null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const next: GeoPos = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          ts: Date.now(),
        };
        setPos(next);
        setStatus("granted");
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setStatus("denied");
        else setStatus("error");
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!autoRequest || typeof navigator === "undefined") return;
    const perms = (navigator as any).permissions;
    if (perms?.query) {
      perms
        .query({ name: "geolocation" as PermissionName })
        .then((res: PermissionStatus) => {
          if (res.state === "denied") {
            setStatus("denied");
          } else {
            // 'granted' or 'prompt' — call getCurrentPosition.
            // Browser shows the prompt automatically when state is 'prompt'.
            request();
          }
        })
        .catch(() => request());
    } else {
      request();
    }
  }, [autoRequest, request]);

  return { pos, status, error, request };
}
