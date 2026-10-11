import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, CloudLightning, CloudRain, Thermometer } from "lucide-react";
import { getWeatherForecast } from "@/lib/weather.functions";
import { evaluateAlert, type WeatherAlert } from "@/lib/weather-rules";

const STYLES: Record<WeatherAlert["type"], { bg: string; border: string; icon: any }> = {
  STORM: { bg: "bg-[#FFF3CD]", border: "border-[#F59E0B]", icon: CloudLightning },
  HEAVY_RAIN: { bg: "bg-[#DBEAFE]", border: "border-[#3B82F6]", icon: CloudRain },
  HEAT_WAVE: { bg: "bg-[#FEE2E2]", border: "border-[#EF4444]", icon: Thermometer },
  GOOD: { bg: "bg-[#DCFCE7]", border: "border-[#22C55E]", icon: CloudRain },
};

export function WeatherAlertBanner({ district }: { district: string | null | undefined }) {
  const fetchForecast = useServerFn(getWeatherForecast);
  const { data } = useQuery({
    queryKey: ["weather-current", district],
    queryFn: () => fetchForecast({ data: { district: district! } }),
    enabled: !!district,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  const alert: WeatherAlert | null =
    data?.forecast && district ? evaluateAlert(district, data.forecast) : null;
  // Only show dangerous conditions in the banner (per spec)
  const showable = alert && alert.type !== "GOOD" ? alert : null;

  const [dismissed, setDismissed] = useState<string | null>(null);
  const [progress, setProgress] = useState(100);

  // Auto-dismiss with 10s countdown
  useEffect(() => {
    if (!showable) return;
    setProgress(100);
    const startedAt = Date.now();
    const totalMs = 10_000;
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.max(0, 100 - (elapsed / totalMs) * 100);
      setProgress(pct);
      if (elapsed >= totalMs) {
        clearInterval(id);
        setDismissed(showable.type + ":" + district);
      }
    }, 100);
    return () => clearInterval(id);
  }, [showable, district]);

  const dismissKey = showable ? showable.type + ":" + district : null;
  const isDismissed = dismissed === dismissKey;

  return (
    <AnimatePresence>
      {showable && !isDismissed && (
        <motion.div
          key={dismissKey}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={`relative overflow-hidden mx-5 mt-4 rounded-2xl border-2 ${STYLES[showable.type].bg} ${STYLES[showable.type].border} p-4 shadow-md`}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {(() => {
                const Icon = STYLES[showable.type].icon;
                return <Icon className="h-6 w-6 text-foreground" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">{showable.title}</h3>
                <button
                  aria-label="বন্ধ"
                  onClick={() => setDismissed(dismissKey!)}
                  className="shrink-0 h-7 w-7 rounded-full hover:bg-black/10 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-foreground/90 mt-1 leading-snug">{showable.body}</p>
              <Link
                to="/weather"
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-foreground underline-offset-2 hover:underline"
              >
                বিস্তারিত জানুন <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          {/* Countdown bar */}
          <div
            className="absolute bottom-0 left-0 h-1 bg-foreground/30 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
