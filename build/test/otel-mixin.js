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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const node_test_1 = require("node:test");
const node_stream_1 = require("node:stream");
const node_module_1 = __importDefault(require("node:module"));
const otel = __importStar(require("@opentelemetry/api"));
const pino_logger_1 = __importDefault(require("../pino-logger"));
const otel_1 = require("../otel");
(0, node_test_1.describe)("OpenTelemetry Mixin", () => {
    function createCaptureStream(lines) {
        return new node_stream_1.Writable({
            write(chunk, _encoding, callback) {
                try {
                    lines.push(JSON.parse(chunk.toString()));
                }
                catch {
                    // ignore
                }
                callback();
            },
        });
    }
    (0, node_test_1.it)("does not inject trace fields when no span is active", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        log === null || log === void 0 ? void 0 : log.info("plain message without active span");
        chai_1.assert.equal(lines.length, 1);
        chai_1.assert.isUndefined(lines[0].trace_id);
        chai_1.assert.isUndefined(lines[0].span_id);
        chai_1.assert.equal(lines[0].msg, "plain message without active span");
    });
    (0, node_test_1.it)("injects trace_id and span_id when an active span is present", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        const origGetActiveSpan = otel.trace.getActiveSpan;
        // Mock an active span
        otel.trace.getActiveSpan = () => ({
            spanContext: () => ({
                traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
                spanId: "00f067aa0ba902b7",
                traceFlags: 1,
            }),
        });
        try {
            log === null || log === void 0 ? void 0 : log.info({ detail: "test" }, "message with active trace span");
            chai_1.assert.equal(lines.length, 1);
            chai_1.assert.equal(lines[0].trace_id, "4bf92f3577b34da6a3ce929d0e0e4736");
            chai_1.assert.equal(lines[0].span_id, "00f067aa0ba902b7");
            chai_1.assert.equal(lines[0].trace_flags, "1");
            chai_1.assert.equal(lines[0].detail, "test");
        }
        finally {
            otel.trace.getActiveSpan = origGetActiveSpan;
        }
    });
    (0, node_test_1.it)("does not inject all-zero trace IDs when an inactive or NonRecordingSpan is returned", () => {
        const lines = [];
        const log = (0, pino_logger_1.default)({ name: "test", logToConsole: true }, createCaptureStream(lines));
        const origGetActiveSpan = otel.trace.getActiveSpan;
        // Mock NonRecordingSpan with invalid all-zero IDs
        otel.trace.getActiveSpan = () => ({
            spanContext: () => ({
                traceId: "00000000000000000000000000000000",
                spanId: "0000000000000000",
                traceFlags: 0,
            }),
        });
        try {
            log === null || log === void 0 ? void 0 : log.info({ detail: "test" }, "message with invalid/zero span");
            chai_1.assert.equal(lines.length, 1);
            chai_1.assert.isUndefined(lines[0].trace_id);
            chai_1.assert.isUndefined(lines[0].span_id);
            chai_1.assert.isUndefined(lines[0].trace_flags);
            chai_1.assert.equal(lines[0].detail, "test");
        }
        finally {
            otel.trace.getActiveSpan = origGetActiveSpan;
        }
    });
    (0, node_test_1.it)("gracefully returns empty object when @opentelemetry/api cannot be resolved", () => {
        const mod = node_module_1.default;
        const origResolve = mod._resolveFilename;
        mod._resolveFilename = function (request, ...args) {
            if (request === "@opentelemetry/api") {
                const err = new Error("Cannot find module @opentelemetry/api");
                err.code = "MODULE_NOT_FOUND";
                throw err;
            }
            return origResolve.call(this, request, ...args);
        };
        try {
            (0, otel_1.resetOtelForTesting)();
            const ctx = (0, otel_1.getOtelTraceContext)();
            chai_1.assert.deepEqual(ctx, {});
        }
        finally {
            mod._resolveFilename = origResolve;
            (0, otel_1.resetOtelForTesting)();
        }
    });
});
//# sourceMappingURL=otel-mixin.js.map