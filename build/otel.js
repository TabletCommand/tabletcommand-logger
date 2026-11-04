"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetOtelForTesting = resetOtelForTesting;
exports.getOtelTraceContext = getOtelTraceContext;
// Cached module reference so we only require once
let otelLoaded = false;
let otelTrace = null;
function getOtelTrace() {
    var _a;
    if (!otelLoaded) {
        otelLoaded = true;
        try {
            const otel = require("@opentelemetry/api");
            otelTrace = (_a = otel === null || otel === void 0 ? void 0 : otel.trace) !== null && _a !== void 0 ? _a : null;
        }
        catch {
            otelTrace = null;
        }
    }
    return otelTrace;
}
function resetOtelForTesting() {
    otelLoaded = false;
    otelTrace = null;
}
function getOtelTraceContext() {
    try {
        const trace = getOtelTrace();
        if (!trace) {
            return {};
        }
        const span = trace.getActiveSpan();
        if (!span) {
            return {};
        }
        const spanContext = span.spanContext();
        const isValid = typeof trace.isSpanContextValid === "function"
            ? trace.isSpanContextValid(spanContext)
            : (spanContext === null || spanContext === void 0 ? void 0 : spanContext.traceId) !== "00000000000000000000000000000000" &&
                (spanContext === null || spanContext === void 0 ? void 0 : spanContext.spanId) !== "0000000000000000";
        if (spanContext && spanContext.traceId && spanContext.spanId && isValid) {
            return {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
                ...(spanContext.traceFlags !== undefined ? { trace_flags: String(spanContext.traceFlags) } : {}),
            };
        }
    }
    catch {
        // Optional dependency, ignore any errors
    }
    return {};
}
//# sourceMappingURL=otel.js.map