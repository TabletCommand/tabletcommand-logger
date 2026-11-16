import { assert } from "chai";
import { describe, it } from "node:test";
import { Writable } from "node:stream";
import Module from "node:module";
import * as otel from "@opentelemetry/api";
import logger from "../pino-logger";
import { getOtelTraceContext, resetOtelForTesting } from "../otel";

describe("OpenTelemetry Mixin", () => {
  function createCaptureStream(lines: Record<string, unknown>[]) {
    return new Writable({
      write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void) {
        try {
          lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
        } catch {
          // ignore
        }
        callback();
      },
    });
  }

  it("does not inject trace fields when no span is active", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    log?.info("plain message without active span");

    assert.equal(lines.length, 1);
    assert.isUndefined(lines[0].trace_id);
    assert.isUndefined(lines[0].span_id);
    assert.equal(lines[0].msg, "plain message without active span");
  });

  it("injects trace_id and span_id when an active span is present", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    const origGetActiveSpan = otel.trace.getActiveSpan;
    // Mock an active span
    (otel.trace as any).getActiveSpan = () => ({
      spanContext: () => ({
        traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
        spanId: "00f067aa0ba902b7",
        traceFlags: 1,
      }),
    });

    try {
      log?.info({ detail: "test" }, "message with active trace span");

      assert.equal(lines.length, 1);
      assert.equal(lines[0].trace_id, "4bf92f3577b34da6a3ce929d0e0e4736");
      assert.equal(lines[0].span_id, "00f067aa0ba902b7");
      assert.equal(lines[0].trace_flags, "1");
      assert.equal(lines[0].detail, "test");
    } finally {
      (otel.trace as any).getActiveSpan = origGetActiveSpan;
    }
  });

  it("does not inject all-zero trace IDs when an inactive or NonRecordingSpan is returned", () => {
    const lines: Record<string, unknown>[] = [];
    const log = logger(
      { name: "test", logToConsole: true },
      createCaptureStream(lines)
    );

    const origGetActiveSpan = otel.trace.getActiveSpan;
    // Mock NonRecordingSpan with invalid all-zero IDs
    (otel.trace as any).getActiveSpan = () => ({
      spanContext: () => ({
        traceId: "00000000000000000000000000000000",
        spanId: "0000000000000000",
        traceFlags: 0,
      }),
    });

    try {
      log?.info({ detail: "test" }, "message with invalid/zero span");

      assert.equal(lines.length, 1);
      assert.isUndefined(lines[0].trace_id);
      assert.isUndefined(lines[0].span_id);
      assert.isUndefined(lines[0].trace_flags);
      assert.equal(lines[0].detail, "test");
    } finally {
      (otel.trace as any).getActiveSpan = origGetActiveSpan;
    }
  });

  it("gracefully returns empty object when @opentelemetry/api cannot be resolved", () => {
    const mod = Module as unknown as { _resolveFilename: (request: string, ...args: unknown[]) => string };
    const origResolve = mod._resolveFilename;
    mod._resolveFilename = function (request: string, ...args: unknown[]) {
      if (request === "@opentelemetry/api") {
        const err = new Error("Cannot find module @opentelemetry/api") as Error & { code: string };
        err.code = "MODULE_NOT_FOUND";
        throw err;
      }
      return origResolve.call(this, request, ...args);
    };

    try {
      resetOtelForTesting();
      const ctx = getOtelTraceContext();
      assert.deepEqual(ctx, {});
    } finally {
      mod._resolveFilename = origResolve;
      resetOtelForTesting();
    }
  });
});
