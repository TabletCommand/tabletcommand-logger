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
const chai_1 = require("chai");
const node_test_1 = require("node:test");
const node_stream_1 = require("node:stream");
const pino_logger_1 = __importStar(require("../pino-logger"));
(0, node_test_1.describe)("Logger Factory", () => {
    function createCaptureStream(lines) {
        return new node_stream_1.Writable({
            write(chunk, _encoding, callback) {
                try {
                    const str = chunk.toString();
                    const parsed = JSON.parse(str);
                    lines.push(parsed);
                }
                catch {
                    // ignore
                }
                callback();
            },
        });
    }
    (0, node_test_1.it)("creates a logger that outputs valid JSON with base service name", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: true,
        }, createCaptureStream(lines));
        chai_1.assert.isNotNull(log);
        log === null || log === void 0 ? void 0 : log.info({ action: "login" }, "user logged in");
        chai_1.assert.equal(lines.length, 1);
        const line = lines[0];
        chai_1.assert.equal(line.service, "test-service");
        chai_1.assert.equal(line.level, "info");
        chai_1.assert.equal(line.msg, "user logged in");
        chai_1.assert.equal(line.action, "login");
        chai_1.assert.isString(line.time);
    });
    (0, node_test_1.it)("formats level as string label", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: true,
        }, createCaptureStream(lines));
        chai_1.assert.isNotNull(log);
        log === null || log === void 0 ? void 0 : log.warn({ count: 5 }, "threshold warning");
        log === null || log === void 0 ? void 0 : log.error(new Error("disk full"), "failure");
        chai_1.assert.equal(lines.length, 2);
        chai_1.assert.equal(lines[0].level, "warn");
        chai_1.assert.equal(lines[1].level, "error");
    });
    (0, node_test_1.it)("includes extraMeta in the base fields", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: true,
            extraMeta: {
                environment: "qa",
                cluster: "us-west-2",
            },
        }, createCaptureStream(lines));
        chai_1.assert.isNotNull(log);
        log === null || log === void 0 ? void 0 : log.info("started");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].environment, "qa");
        chai_1.assert.equal(lines[0].cluster, "us-west-2");
        chai_1.assert.equal(lines[0].service, "test-service");
    });
    (0, node_test_1.it)("respects custom log level override", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: true,
            level: "warn",
        }, createCaptureStream(lines));
        chai_1.assert.isNotNull(log);
        log === null || log === void 0 ? void 0 : log.info("this should be filtered out");
        log === null || log === void 0 ? void 0 : log.warn("this should be logged");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].msg, "this should be logged");
    });
    (0, node_test_1.it)("supports disabling pretty-printing via config.pretty: false", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: true,
            pretty: false,
        }, createCaptureStream(lines));
        chai_1.assert.isNotNull(log);
        log === null || log === void 0 ? void 0 : log.info("ndjson output test");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].msg, "ndjson output test");
    });
    (0, node_test_1.it)("supports disabling pretty-printing via PINO_PRETTY=false env variable", () => {
        const origEnv = process.env.PINO_PRETTY;
        process.env.PINO_PRETTY = "false";
        try {
            const lines = [];
            const log = (0, pino_logger_1.default)({
                name: "test-service",
                logToConsole: true,
            }, createCaptureStream(lines));
            chai_1.assert.isNotNull(log);
            log === null || log === void 0 ? void 0 : log.info("ndjson env test");
            chai_1.assert.equal(lines.length, 1);
            chai_1.assert.equal(lines[0].msg, "ndjson env test");
        }
        finally {
            if (origEnv !== undefined) {
                process.env.PINO_PRETTY = origEnv;
            }
            else {
                delete process.env.PINO_PRETTY;
            }
        }
    });
    (0, node_test_1.it)("exports isPinoPrettyAvailable helper and reports boolean", () => {
        chai_1.assert.isBoolean((0, pino_logger_1.isPinoPrettyAvailable)());
    });
    (0, node_test_1.it)("handles config.pretty: true gracefully and returns a valid logger instance", () => {
        const log = (0, pino_logger_1.default)({
            name: "pretty-test-service",
            pretty: true,
        });
        chai_1.assert.isNotNull(log);
        chai_1.assert.isFunction(log === null || log === void 0 ? void 0 : log.info);
    });
    (0, node_test_1.it)("correctly enables logger or returns null based on transport config", () => {
        // {logToConsole: true} -> logger
        chai_1.assert.isNotNull((0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: true,
        }));
        // {logToConsole: false, logToFile: true} -> logger (regression guard)
        chai_1.assert.isNotNull((0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: false,
            logToFile: true,
        }));
        // {logToConsole: false, logToDatadog: true} -> logger (regression guard)
        chai_1.assert.isNotNull((0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: false,
            logToDatadog: true,
        }));
        // {name only} -> logger
        chai_1.assert.isNotNull((0, pino_logger_1.default)({
            name: "test-service",
        }));
        // {logToConsole: false, logToFile: false, logToDatadog: false} -> null
        chai_1.assert.isNull((0, pino_logger_1.default)({
            name: "test-service",
            logToConsole: false,
            logToFile: false,
            logToDatadog: false,
        }));
    });
    (0, node_test_1.it)("child logger inherits service name and attaches child bindings", () => {
        const lines = [];
        const parent = (0, pino_logger_1.default)({
            name: "parent-service",
            logToConsole: true,
        }, createCaptureStream(lines));
        chai_1.assert.isNotNull(parent);
        const child = parent === null || parent === void 0 ? void 0 : parent.child({ requestId: "req-123" });
        child === null || child === void 0 ? void 0 : child.info({ data: 42 }, "processing request");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.equal(lines[0].service, "parent-service");
        chai_1.assert.equal(lines[0].requestId, "req-123");
        chai_1.assert.equal(lines[0].data, 42);
        chai_1.assert.equal(lines[0].msg, "processing request");
    });
});
//# sourceMappingURL=logger-factory.js.map