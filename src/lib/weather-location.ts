import type { GeoPos } from "@/hooks/use-geolocation";

export function dashboardWeatherLocation(
  district: string | null | undefined,
  upazila: string | null | undefined,
  pos: GeoPos | null,
  selectedDistrict: string | null,
) {
  const resolvedDistrict = selectedDistrict || district || "ঢাকা";
  const usingGps = selectedDistrict === null && pos !== null;
  const resolvedUpazila = selectedDistrict ? null : upazila ?? null;
  return {
    district: resolvedDistrict,
    upazila: resolvedUpazila,
    lat: usingGps ? pos?.lat ?? null : null,
    lng: usingGps ? pos?.lng ?? null : null,
    usingGps,
    label: usingGps ? "আপনার লোকেশন" : resolvedUpazila ? `${resolvedUpazila}, ${resolvedDistrict}` : resolvedDistrict,
  };
}