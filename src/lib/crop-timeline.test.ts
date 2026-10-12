import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scaleGuide } from "@/lib/crop-timeline";
import { ipmWeatherAlerts } from "@/lib/ipm-weather";
import type { Forecast } from "@/lib/weather-types";

describe("variety timeline scaling", () => {
  const g = { totalDays: 100, stages: [{ startDay: 0, endDay: 40 }, { startDay: 40, endDay: 100 }] };
  it("a 120-day variety stretches stages to 120 days, contiguous", () => {
    const s = scaleGuide(g, 120);
    assert.equal(s.totalDays, 120);
    assert.equal(s.stages[1].startDay, s.stages[0].endDay);
    assert.equal(s.stages[1].endDay, 120);
  });
  it("scaling is capped at 30%", () => assert.equal(scaleGuide(g, 300).totalDays, 130));
});

describe("weather IPM alerts", () => {
  const f = (temp: number, humidity: number, rain: number): Forecast => ({
    current: { temperature: temp, weather_code: 0, precipitation_prob: rain, wind_speed: 5, humidity, is_day: true, time: "" },
    hourly: Array.from({ length: 24 }, () => ({ time: "", temperature: temp, precipitation_probability: rain, weather_code: 0 })),
    daily: [],
    past_rainfall: [],
  });
  it("cool wet weather warns tomato of late blight", () =>
    assert.match(ipmWeatherAlerts(f(18, 90, 70), ["টমেটো"])[0].title, /লেট ব্লাইট/));
  it("mild dry weather gives no alert", () => assert.equal(ipmWeatherAlerts(f(24, 60, 10), ["টমেটো"]).length, 0));
});
