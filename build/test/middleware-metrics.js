"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const metrics_1 = __importDefault(require("../middleware/metrics"));
const metrics = (0, metrics_1.default)();
describe("Metrics Middleware", function () {
    context("Default Filter", () => {
        it("removes uuid from end of paths", function () {
            const path = "api.user.daafe605-feac-add0-ad0e-89023d48deab";
            const cleanPath = metrics.defaultFilter(path);
            chai_1.assert.equal(cleanPath, "api.user");
        });
        it("removes uuid from middle of paths", function () {
            const path = "api.user.daafe605-feac-add0-ad0e-89023d48deab.info";
            const cleanPath = metrics.defaultFilter(path);
            chai_1.assert.equal(cleanPath, "api.user.info");
        });
        it("removes mongo id from middle of paths", function () {
            const path = "api.online.515a41a3e0387575cc939002.status";
            const cleanPath = metrics.defaultFilter(path);
            chai_1.assert.equal(cleanPath, "api.online.status");
        });
        it("skips paths without uuid", function () {
            const path = "api.user.profile";
            const cleanPath = metrics.defaultFilter(path);
            chai_1.assert.equal(cleanPath, "api.user.profile");
        });
    });
    context("setStatsDKey", () => {
        it("Parses URL without a set base hostname", () => {
            const sampleUrl = "/api/v2/cad-vehicle-status?apikey=some123key";
            const req = {
                method: "POST",
                url: sampleUrl,
            };
            const hostname = "a";
            const env = "b";
            metrics.setStatsDKey(req, hostname, env);
            const expectedStatsdKey = "a.b.http.post.api.v2.cad-vehicle-status";
            chai_1.assert.equal(req.statsdKey, expectedStatsdKey);
        });
    });
    context("cleanUpParams", () => {
        it("cleans up params", () => {
            const req = {
                url: "/api/a1/admin/department/abcd",
                params: {
                    departmentId: "abcd",
                    x123: "admin",
                }
            };
            const path = metrics.cleanUpParams(req);
            chai_1.assert.strictEqual(path, "api.a1.x123.department.departmentId");
        });
    });
});
//# sourceMappingURL=middleware-metrics.js.map