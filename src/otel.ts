export interface OtelSpanContext {
  trace_id?: string;
  span_id?: string;
  trace_flags?: string;
}

// Cached module reference so we only require once
let otelLoaded = false;
let otelTrace: typeof import("@opentelemetry/api").trace | null = null;

function getOtelTrace(): typeof import("@opentelemetry/api").trace | null {
  if (!otelLoaded) {
    otelLoaded = true;
    try {
      const otel = require("@opentelemetry/api") as typeof import("@opentelemetry/api");
      otelTrace = otel?.trace ?? null;
    } catch {
      otelTrace = null;
    }
  }
  return otelTrace;
}

export function resetOtelForTesting(): void {
  otelLoaded = false;
  otelTrace = null;
}

export function getOtelTraceContext(): OtelSpanContext {
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
    if (spanContext && spanContext.traceId && spanContext.spanId) {
      return {
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
        ...(spanContext.traceFlags !== undefined ? { trace_flags: String(spanContext.traceFlags) } : {}),
      };
    }
  } catch {
    // Optional dependency, ignore any errors
  }
  return {};
}
