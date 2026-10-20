import type { GeoPos } from "@/hooks/use-geolocation";

export function dashboardWeatherLocation(
  district: string | null | undefined,
  upazila: string | null | undefined,
  pos: GeoPos | null,
) {
  const usingGps = pos !== null;
  const resolvedDistrict = district || "ঢাকা";
  const resolvedUpazila = upazila ?? null;
  return {
    district: resolvedDistrict,
    upazila: resolvedUpazila,
    lat: usingGps ? pos?.lat ?? null : null,
    lng: usingGps ? pos?.lng ?? null : null,
    usingGps,
    label: usingGps ? "আপনার লোকেশন" : resolvedUpazila ? `${resolvedUpazila}, ${resolvedDistrict}` : resolvedDistrict,
  };
}