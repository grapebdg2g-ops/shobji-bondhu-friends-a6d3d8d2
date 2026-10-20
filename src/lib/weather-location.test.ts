import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dashboardWeatherLocation } from "./weather-location";

const gps = { lat: 24.9, lng: 91.9, accuracy: 10, ts: 1 };
describe("dashboard weather location", () => {
  it("uses Dhaka without a profile or GPS", () => {
    const location = dashboardWeatherLocation(null, null, null);
    assert.equal(location.district, "ঢাকা");
    assert.equal(location.usingGps, false);
  });
  it("uses GPS even without a profile district", () => {
    const location = dashboardWeatherLocation(null, null, gps);
    assert.equal(location.lat, 24.9);
    assert.equal(location.lng, 91.9);
    assert.equal(location.usingGps, true);
  });
  it("keeps the profile location when GPS is unavailable", () => {
    const location = dashboardWeatherLocation("সিলেট", "গোলাপগঞ্জ", null);
    assert.equal(location.district, "সিলেট");
    assert.equal(location.upazila, "গোলাপগঞ্জ");
  });
});
