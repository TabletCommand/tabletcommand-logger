"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
const chai_1 = require("chai");
const metrics_1 = __importStar(require("../middleware/metrics"));
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
});
describe("cleanUpParams", () => {
    it("cleans up params", () => {
        const req = {
            statsdKey: "api.a1.admin.department.abcd",
            params: {
                departmentId: "abcd",
                x123: "admin",
            }
        };
        (0, metrics_1.cleanUpParams)(req);
        chai_1.assert.strictEqual(req.statsdKey, "api.a1.x123.department.departmentid"); // cspell: words departmentid
    });
    it("cleans up params when values are undefined", () => {
        const req = {
            statsdKey: "api.a1.admin.department",
            params: {
                departmentId: undefined, // Force value to undefined, when setting param as optional ":departmentId?"
                x123: "admin",
            }
        };
        (0, metrics_1.cleanUpParams)(req);
        chai_1.assert.strictEqual(req.statsdKey, "api.a1.x123.department");
    });
});
//# sourceMappingURL=middleware-metrics.js.map