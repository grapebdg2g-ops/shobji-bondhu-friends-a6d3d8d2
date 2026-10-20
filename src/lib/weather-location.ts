import type { GeoPos } from "@/hooks/use-geolocation";

export function dashboardWeatherLocation(
  district: string | null | undefined,
  upazila: string | null | undefined,
  pos: GeoPos | null,
) {
  const usingGps = pos !== null;
  const resolvedDistrict = usingGps ? district || "ঢাকা" : district || "ঢাকা";
  return {
    district: resolvedDistrict,
    upazila: resolvedUpazila,
    lat: usingGps ? pos?.lat ?? null : null,
    lng: usingGps ? pos?.lng ?? null : null,
    usingGps,
    label: usingGps ? "আপনার লোকেশন" : resolvedUpazila ? `${resolvedUpazila}, ${resolvedDistrict}` : resolvedDistrict,
  };
}