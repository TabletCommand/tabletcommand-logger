export interface OtelSpanContext {
    trace_id?: string;
    span_id?: string;
    trace_flags?: string;
}
export declare function resetOtelForTesting(): void;
export declare function getOtelTraceContext(): OtelSpanContext;
//# sourceMappingURL=otel.d.ts.map