import { assert } from "chai";
import MetricsModule from "../middleware/metrics";
const metrics = MetricsModule();

describe("Metrics Middleware", function() {
  it("removes uuid from end of paths", function() {
    const path = "api.user.daafe605-feac-add0-ad0e-89023d48deab";
    const cleanPath = metrics.defaultFilter(path);
    assert.equal(cleanPath, "api.user");
  });

  it("removes uuid from middle of paths", function() {
    const path = "api.user.daafe605-feac-add0-ad0e-89023d48deab.info";
    const cleanPath = metrics.defaultFilter(path);
    assert.equal(cleanPath, "api.user.info");
  });

  it("removes mongo id from middle of paths", function() {
    const path = "api.online.515a41a3e0387575cc939002.status";
    const cleanPath = metrics.defaultFilter(path);
    assert.equal(cleanPath, "api.online.status");
  });

  it("skips paths without uuid", function() {
    const path = "api.user.profile";
    const cleanPath = metrics.defaultFilter(path);
    assert.equal(cleanPath, "api.user.profile");
  });
});
