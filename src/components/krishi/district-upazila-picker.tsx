import { useMemo, useState } from "react";
import { getDistricts, getUpazilas } from "@/data/bd-locations";

type Props = {
  district: string;
  upazila: string;
  onDistrictChange: (d: string) => void;
  onUpazilaChange: (u: string) => void;
  layout?: "stack" | "row";
  districtLabel?: string;
  upazilaLabel?: string;
  required?: boolean;
};

/**
 * Cascading district → upazila picker using plain selects (matches existing form styling).
 * When district changes, upazila is auto-cleared by the parent via the supplied setters.
 */
export function DistrictUpazilaPicker({
  district,
  upazila,
  onDistrictChange,
  onUpazilaChange,
  layout = "stack",
  districtLabel = "জেলা",
  upazilaLabel = "উপজেলা",
  required,
}: Props) {
  const [q, setQ] = useState("");
  const all = useMemo(() => getDistricts(), []);
  const districts = useMemo(() => {
    const t = q.trim();
    const list = t ? all.filter((d) => d.includes(t)) : all;
    return district && !list.includes(district) ? [district, ...list] : list;
  }, [all, q, district]);
  const upazilas = useMemo(() => getUpazilas(district), [district]);

  const handleDistrict = (val: string) => {
    onDistrictChange(val);
    if (val !== district) onUpazilaChange("");
  };

  const wrap = layout === "row" ? "grid grid-cols-2 gap-3" : "space-y-4";

  return (
    <div className={wrap}>
      <label className="block">
        <span className="block text-sm font-semibold text-foreground mb-1.5">{districtLabel}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="জেলা খুঁজুন…"
          aria-label="জেলা খুঁজুন"
          className="w-full h-11 px-3 mb-2 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <select
          required={required}
          value={district}
          onChange={(e) => handleDistrict(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">— নির্বাচন করুন —</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm font-semibold text-foreground mb-1.5">{upazilaLabel}</span>
        <select
          required={required}
          disabled={!district}
          value={upazila}
          onChange={(e) => onUpazilaChange(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <option value="">{district ? "— উপজেলা বেছে নিন —" : "আগে জেলা বেছে নিন"}</option>
          {upazilas.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
